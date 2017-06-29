package edu.drew.dm.rdf;

import edu.drew.dm.rdf.OpenAnnotation;
import edu.drew.dm.rdf.OpenArchivesTerms;
import edu.drew.dm.rdf.SharedCanvas;
import edu.drew.dm.rdf.Traversal;
import org.apache.jena.vocabulary.DCTypes;

import java.util.Arrays;
import java.util.Collections;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class Annotations {

    public static final Traversal SPECIFIC_RESOURCE_SCOPE = new Traversal()
            .configureType(
                    OpenAnnotation.SpecificResource,
                    Collections.singleton(OpenAnnotation.hasBody),
                    Arrays.asList(OpenAnnotation.hasSource, OpenAnnotation.hasSelector)
            )
            .configureType(
                    OpenAnnotation.Annotation,
                    Collections.emptySet(),
                    Collections.singleton(OpenAnnotation.hasTarget)
            );

    public static final Traversal SCOPE = new Traversal()
            .configureType(
                    SharedCanvas.Canvas,
                    Arrays.asList(OpenAnnotation.hasBody, OpenAnnotation.hasSource, OpenAnnotation.hasTarget, OpenArchivesTerms.aggregates),
                    Collections.emptySet()
            )
            .configureType(
                    DCTypes.Text,
                    Arrays.asList(OpenAnnotation.hasBody, OpenAnnotation.hasSource, OpenAnnotation.hasTarget, OpenArchivesTerms.aggregates),
                    Collections.emptySet()
            )
            .configureType(
                    OpenAnnotation.SpecificResource,
                    Collections.singleton(OpenAnnotation.hasTarget),
                    Arrays.asList(OpenAnnotation.hasSelector)
            )
            .configureType(
                    OpenAnnotation.Annotation,
                    Collections.emptySet(),
                    Arrays.asList(OpenAnnotation.hasBody, OpenAnnotation.hasTarget)
            );
}