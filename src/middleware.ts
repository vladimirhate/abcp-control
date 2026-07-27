import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set(name, value)
          response.cookies.set(name, value, options)
        },
        remove(name: string, options: any) {
          request.cookies.set(name, '')
          response.cookies.set(name, '', options)
        },
      },
    }
  )

  // Проверяем сессию пользователя
  const { data: { user } } = await supabase.auth.getUser()

  // Если пользователь не авторизован и пытается зайти не на /login -> кидаем на /login
  if (!user && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Если пользователь авторизован, но пытается зайти на /login -> кидаем на дашборд
  if (user && request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

// Указываем, на какие маршруты не распространяется middleware (статика, API, логин)
export const config = {
  matcher: ['/((?!login|api|_next/static|_next/image|favicon.ico).*)'],
}