import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 不需要认证的路径
const PUBLIC_PATHS = ['/signin', '/signup', '/forgot-password']

// 需要认证的路径前缀
const PROTECTED_PATH_PREFIXES = ['/workspace']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // 获取 token（从 cookie 或 localStorage 的备份 cookie）
  const token = request.cookies.get('nc_token')?.value

  // 检查是否是公开路径
  const isPublicPath = PUBLIC_PATHS.some(path => pathname.startsWith(path))
  
  // 检查是否是受保护路径
  const isProtectedPath = PROTECTED_PATH_PREFIXES.some(prefix => pathname.startsWith(prefix))

  // 如果访问受保护路径但没有 token，重定向到登录页
  if (isProtectedPath && !token) {
    const signinUrl = new URL('/signin', request.url)
    signinUrl.searchParams.set('redirect_to', pathname)
    return NextResponse.redirect(signinUrl)
  }

  // 如果已登录且访问公开路径，重定向到 workspace
  if (isPublicPath && token) {
    return NextResponse.redirect(new URL('/workspace', request.url))
  }

  // 根路径处理
  if (pathname === '/') {
    if (token) {
      return NextResponse.redirect(new URL('/workspace', request.url))
    } else {
      return NextResponse.redirect(new URL('/signin', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
  ],
}
