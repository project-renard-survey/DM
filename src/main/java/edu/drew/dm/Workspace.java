package edu.drew.dm;

import joptsimple.OptionSet;
import org.glassfish.jersey.server.ContainerRequest;
import org.glassfish.jersey.server.mvc.Template;

import javax.inject.Inject;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.ServiceUnavailableException;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.SecurityContext;
import javax.ws.rs.core.UriInfo;
import java.util.HashMap;
import java.util.Map;

/**
 * @author <a href="http://gregor.middell.net/">Gregor Middell</a>
 */
@Path("/workspace/")
public class Workspace {

    @GET
    @Produces("text/html")
    @Template(name = "/workspace.ftl")
    public Map<String, Object> workspace(@Context UriInfo ui, @Context ContainerRequest cr) {
        final Map<String, Object> model = new HashMap<>();
        model.put("cp", ui.getBaseUri().getRawPath().replaceAll("/$", ""));
        model.put("user", cr.getSecurityContext());
        model.put("useCompiledJs", true);
        return model;
    }

    @Path("project_forward/")
    public Response projectForward() {
        throw Server.NOT_IMPLEMENTED;

    }

    @Path("add_image/")
    public Response addImage() {
        throw Server.NOT_IMPLEMENTED;

    }

    @Path("upload_image/")
    public Response uploadImage() {
        throw Server.NOT_IMPLEMENTED;

    }
}
