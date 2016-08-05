package edu.drew.dm.task;

import au.com.bytecode.opencsv.CSVReader;
import edu.drew.dm.semantics.Models;
import edu.drew.dm.http.User;
import edu.drew.dm.data.SemanticDatabase;
import edu.drew.dm.semantics.Perm;
import org.apache.jena.rdf.model.Model;
import org.apache.jena.rdf.model.Property;
import org.apache.jena.rdf.model.Resource;
import org.apache.jena.sparql.vocabulary.FOAF;
import org.apache.jena.vocabulary.DCTypes;
import org.apache.jena.vocabulary.RDF;
import org.apache.jena.vocabulary.RDFS;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.Set;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
public class UserbaseInitialization {

    public static SemanticDatabase execute(SemanticDatabase db, CSVReader csv) {
        try {
            final User[] users = csv.readAll().stream()
                    .skip(1)
                    .map(user -> new User(
                            user[0],
                            user[1],
                            user[2],
                            user[3],
                            Boolean.parseBoolean(user[4]),
                            user[5]
                    ))
                    .toArray(User[]::new);

            final Set<Resource> projects = db.read((source, target) -> target.add(source.listStatements(null, RDF.type, DCTypes.Collection))).listSubjects().toSet();

            final Model userModel = Models.create();

            for (User user : users) {
                final Resource userResource = userModel.createResource(user.uri())
                        .addProperty(RDF.type, FOAF.Agent)
                        .addProperty(RDFS.label, user.account)
                        .addProperty(FOAF.firstName, user.firstName)
                        .addProperty(FOAF.surname, user.lastName)
                        .addProperty(FOAF.mbox, userModel.createResource(user.mbox()));

                for (Resource project : projects) {
                    for (Property permission : Perm.USER_PERMISSIONS) {
                        userResource.addProperty(permission, project);
                    }
                    if (user.admin) {
                        for (Property permission : Perm.ADMIN_PERMISSIONS) {
                            userResource.addProperty(permission, project);
                        }

                    }
                }
            }

            db.merge(userModel);

            return db;
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
