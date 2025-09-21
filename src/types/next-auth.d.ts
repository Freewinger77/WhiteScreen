import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      linkedinId?: string
      given_name?: string
      family_name?: string
    }
  }

  interface User {
    linkedinId?: string
    given_name?: string
    family_name?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    linkedinId?: string
    given_name?: string
    family_name?: string
  }
}

