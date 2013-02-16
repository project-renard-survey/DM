from optparse import make_option
import datetime
import pprint

from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from django.core.urlresolvers import reverse
from django.db import transaction

from rdflib.graph import Graph, ConjunctiveGraph
from rdflib import URIRef, RDF
from rdflib.namespace import Namespace

import rdfstore
#from semantic_store import store as main_store
from semantic_store import collection


ns = dict(
    rdf=RDF,
    dms=Namespace("http://dms.stanford.edu/ns/"),
    sc=Namespace("http://www.shared-canvas.org/ns/"),
    ore=Namespace("http://www.openarchives.org/ore/terms/"),
    dc=Namespace("http://purl.org/dc/elements/1.1/"),
    dcmitype=Namespace("http://purl.org/dc/dcmitype/"),
    exif=Namespace("http://www.w3.org/2003/12/exif/ns#"),
    tei=Namespace("http://www.tei-c.org/ns/1.0/"),
    oac=Namespace("http://www.openannotation.org/ns/"))


col_res_attributes = (ns['dc']['title'], 
                      ns['rdf']['type'], 
                      ns['dc']['identifier'], 
                      ns['tei']['repository'],
                      ns['tei']['settlement'], 
                      ns['tei']['idno'], 
                      ns['tei']['institution'],
                      ns['tei']['country'])


class Command(BaseCommand):
    option_list = BaseCommand.option_list + (
        make_option('--purge',
                    dest='purge',
                    help="Purge all triples for this collection and re-harvest."),
        make_option('--url',
                    default=None,
                    dest='url',
                    help="Collection URL (manifest_file or this is required)"),
        make_option('--manifest_file',
                    default=None,
                    dest='manifest_file',
                    help="Collection manifest (this or url is required)"),
        make_option('--uri',
                    default=None,
                    dest='uri',
                    help="Collection URI (required)"),
        make_option('--store_host',
                    default=None,
                    dest='store_host',
                    help="Store hostname and port (if other than 80) (required)"))


    def localize_describes(self, uri, url, g):
        for t in g.triples((URIRef(url), ns['ore']['describes'], URIRef(uri))):
            g.remove(t)
        for t in g.triples((URIRef(uri), ns['ore']['isDescribedBy'], URIRef(url))):
            g.remove(t)
        local_rel_url = reverse('semantic_store_manifest' , kwargs={'uri': str(uri)})
        local_abs_url = "http://%s%s" % (self.store_host, local_rel_url)
        g.add((URIRef(uri), ns['ore']['isDescribedBy'], URIRef(local_abs_url)))


    def handle(self, *args, **options):
        col_url = options['url']
        col_uri = options['uri']
        manifest_file = options['manifest_file']
        self.store_host = options['store_host']
        if ((not col_url) or (not manifest_file) or (not col_uri) or 
            (not self.store_host)):
            print "url or manifest_file and uri arguments are required."
            exit(0)
        
        with transaction.commit_on_success():        
            col_g = Graph(store=rdfstore.rdfstore(), identifier=URIRef(col_uri))
            collection.fetch_and_parse(col_url, col_g, manifest_file=manifest_file)
            self.localize_describes(col_uri, col_url, col_g)

            res_uris_urls = collection.aggregated_uris_urls(col_uri, col_g)
            for res_uri, res_url in res_uris_urls:
                res_g = Graph(store=rdfstore.rdfstore(), identifier=URIRef(res_uri))
                collection.fetch_and_parse(res_url, res_g)
                for pred in col_res_attributes:
                    for t in res_g.triples((res_uri, pred, None)):
                        col_g.add(t)

                aggr_uris_urls = collection.aggregated_uris_urls(res_uri, res_g)
                for aggr_uri, aggr_url in aggr_uris_urls:
                    if aggr_url:
                        collection.fetch_and_parse(aggr_url, res_g)
                        self.localize_describes(aggr_uri, aggr_url, res_g)

                seq_uris_urls = collection.aggregated_seq_uris_urls(res_uri, res_g)
                for seq_uri, seq_url in seq_uris_urls:
                    page_uris_urls = collection.aggregated_uris_urls(seq_uri, res_g)
                    for page_uri, page_url in page_uris_urls:
                        self.localize_describes(page_uri, page_url, res_g)
                self.localize_describes(res_uri, res_url, res_g)
                self.localize_describes(res_uri, res_url, col_g)
        
                