package edu.drew.dm.rdf;

import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.ModelFactory;
import org.apache.jena.rdf.model.Property;
import org.apache.jena.rdf.model.Resource;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class OpenAnnotation {

    private static final Model model = ModelFactory.createDefaultModel();

    public static final String NS = "http://www.w3.org/ns/oa#";

    public static final Resource Annotation = model.createResource(NS + "Annotation");

    public static final Resource SvgSelector = model.createResource(NS + "SvgSelector");

    public static final Resource TextQuoteSelector = model.createResource(NS + "TextQuoteSelector");

    public static final Resource SpecificResource = model.createResource(NS + "SpecificResource");

    public static final Property hasSource = model.createProperty(NS, "hasSource");

    public static final Property hasTarget = model.createProperty(NS, "hasTarget");

    public static final Property hasBody = model.createProperty(NS, "hasBody");

    public static final Property hasSelector = model.createProperty(NS, "hasSelector");

    public static final Property motivatedBy = model.createProperty(NS, "motivatedBy");
}
