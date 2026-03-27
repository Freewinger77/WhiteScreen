import NextAuth from "next-auth";

export const authOptions: any = {
  debug: true,
  secret:
    "bd015afd3abe1285addb655eca39906d71f15498ecb96c7d004d2bf4775159f5",
  providers: [
    {
      id: "linkedin",
      name: "LinkedIn",
      type: "oauth",
      authorization: {
        url: "https://www.linkedin.com/oauth/v2/authorization",
        params: {
          scope: "openid profile email",
          response_type: "code",
        },
      },
      token: {
        url: "https://www.linkedin.com/oauth/v2/accessToken",
        async request({ params }: any) {
          const response = await fetch(
            "https://www.linkedin.com/oauth/v2/accessToken",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                grant_type: "authorization_code",
                code: params.code,
                redirect_uri:
                  params.redirect_uri ||
                  `${process.env.NEXTAUTH_URL || "http://dashboard.rapidscreen.my"}/api/auth/callback/linkedin`,
                client_id: "78ikzrty6iaist",
                client_secret: "WPL_AP1.DJtx39ow7HReDlv6.s/48FA==",
              }),
            }
          );

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
              `Token exchange failed: ${response.status} ${response.statusText} - ${errorText}`
            );
          }

          const tokens = await response.json();
          return { tokens };
        },
      },
      userinfo: {
        url: "https://api.linkedin.com/v2/userinfo",
        async request({ tokens }: any) {
          const response = await fetch("https://api.linkedin.com/v2/userinfo", {
            headers: {
              Authorization: `Bearer ${tokens.access_token}`,
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) {
            throw new Error(
              `Failed to fetch user info: ${response.status} ${response.statusText}`
            );
          }

          const profile = await response.json();
          return profile;
        },
      },
      clientId: "78ikzrty6iaist",
      clientSecret: "WPL_AP1.DJtx39ow7HReDlv6.s/48FA==",
      checks: ["state"],
      profile(profile: any) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          linkedinId: profile.sub,
          given_name: profile.given_name,
          family_name: profile.family_name,
        };
      },
    } as any,
  ],
  callbacks: {
    async jwt({ token, account, profile, user }: any) {
      if (account && (profile || user)) {
        const profileData = profile || user;
        token.linkedinId =
          profileData.linkedinId || profileData.sub || profileData.id;
        token.name = profileData.name;
        token.given_name = profileData.given_name;
        token.family_name = profileData.family_name;
        token.email = profileData.email;
        token.picture = profileData.image || profileData.picture;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        (session.user as any).linkedinId = token.linkedinId;
        (session.user as any).given_name = token.given_name;
        (session.user as any).family_name = token.family_name;
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.image = token.picture as any;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };


