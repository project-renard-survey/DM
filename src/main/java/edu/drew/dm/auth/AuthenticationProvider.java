package edu.drew.dm.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.scribejava.core.model.OAuth2AccessToken;
import com.github.scribejava.core.model.OAuthRequest;
import com.github.scribejava.core.model.Verb;
import com.github.scribejava.core.oauth.OAuth20Service;
import com.typesafe.config.Config;
import edu.drew.dm.Server;
import edu.drew.dm.http.Accounts;
import edu.drew.dm.http.User;

import java.io.IOException;
import java.io.InputStream;
import java.util.concurrent.ExecutionException;
import javax.ws.rs.core.UriInfo;

public interface AuthenticationProvider {

    String getKey();

    String getDescription();

    Config config();

    ObjectMapper objectMapper();

    OAuth20Service oauthService(UriInfo ui);

    String profileUrl();

    User parseProfile(JsonNode profile);

    default User user(UriInfo ui, String authCode) {
        try {
            final OAuth20Service authService = oauthService(ui);
            final OAuth2AccessToken accessToken = authService.getAccessToken(authCode);

            final OAuthRequest profileRequest = new OAuthRequest(Verb.GET, profileUrl());
            authService.signRequest(accessToken, profileRequest);

            try (InputStream profileStream = authService.execute(profileRequest).getStream()) {
                return parseProfile(objectMapper().readTree(profileStream));
            }
        } catch (IOException | InterruptedException | ExecutionException e) {
            throw new RuntimeException(e);
        }

    }

    default boolean isConfigured() {
        final Config config = config();
        final String configPathPrefix = String.join(".", "auth", "oauth", getKey());
        return config.hasPath(String.join(".", configPathPrefix, "key")) &&
                config.hasPath(String.join(".", configPathPrefix, "secret"));
    }


    default String oauthCallbackUri(UriInfo ui) {
        try {
            return Server.baseUri(ui)
                    .path(Accounts.class)
                    .path(Accounts.class.getMethod("oauthCallback", String.class, String.class, UriInfo.class))
                    .build(getKey()).toString();
        } catch (NoSuchMethodException e) {
            throw new RuntimeException(e);
        }
    }

}