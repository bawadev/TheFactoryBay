'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { getCartCountAction } from '@/app/actions/cart'
import { logoutAction } from '@/app/actions/auth'
import LanguageSwitcher from '@/components/LanguageSwitcher'

interface NavigationProps {
  isAuthenticated: boolean
  userEmail?: string
  isAdmin?: boolean
}

export default function Navigation({ isAuthenticated, userEmail, isAdmin }: NavigationProps) {
  const locale = useLocale()
  const pathname = usePathname()
  const [cartCount, setCartCount] = useState(0)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const t = useTranslations('nav')
  const tCommon = useTranslations('common')

  // Fetch cart count on mount and when pathname changes (for all users)
  useEffect(() => {
    fetchCartCount()
  }, [pathname])

  // Close mobile menu when pathname changes
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isMobileMenuOpen])

  const fetchCartCount = async () => {
    const result = await getCartCountAction()
    if (result.success && result.data) {
      setCartCount(result.data.count)
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await logoutAction()
    window.location.href = `/${locale}`
  }

  return (
    <>
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href={`/${locale}`} className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-navy-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">FB</span>
              </div>
              <span className="text-xl font-bold text-navy-900">Factory Bay</span>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-6">
              <LanguageSwitcher />

              <Link
                href={`/${locale}/shop`}
                className={`text-sm font-medium transition-colors ${
                  pathname.includes('/shop')
                    ? 'text-navy-600'
                    : 'text-gray-700 hover:text-navy-600'
                }`}
              >
                {t('shop')}
              </Link>

              {/* Admin Dashboard Link */}
              {isAdmin && (
                <Link
                  href={`/${locale}/admin/dashboard`}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    pathname.includes('/admin')
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  Go to Admin Panel
                </Link>
              )}

              {/* Cart Icon with Badge */}
              <Link
                href={`/${locale}/cart`}
                className={`relative text-sm font-medium transition-colors ${
                  pathname.includes('/cart')
                    ? 'text-navy-600'
                    : 'text-gray-700 hover:text-navy-600'
                }`}
              >
                <div className="relative">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                    />
                  </svg>
                  {cartCount > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-coral-600 text-xs font-bold text-white">
                      {cartCount > 9 ? '9+' : cartCount}
                    </span>
                  )}
                </div>
              </Link>

              {isAuthenticated ? (
                <>
                  <Link
                    href={`/${locale}/profile`}
                    className={`text-sm font-medium transition-colors ${
                      pathname.includes('/profile')
                        ? 'text-navy-600'
                        : 'text-gray-700 hover:text-navy-600'
                    }`}
                  >
                    {t('profile')}
                  </Link>

                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600 hidden lg:inline">
                      {userEmail}
                    </span>
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="text-sm font-medium text-gray-700 hover:text-navy-600 transition-colors disabled:opacity-50"
                    >
                      {isLoggingOut ? tCommon('loggingOut') : tCommon('logout')}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Link
                    href={`/${locale}/login`}
                    className="text-sm font-medium text-gray-700 hover:text-navy-600 transition-colors"
                  >
                    {t('signIn')}
                  </Link>
                  <Link
                    href={`/${locale}/signup`}
                    className="bg-coral-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-coral-500 transition-colors"
                  >
                    {t('getStarted')}
                  </Link>
                </>
              )}
            </div>

            {/* Mobile: Cart + Hamburger */}
            <div className="flex md:hidden items-center gap-4">
              {/* Cart Icon */}
              <Link
                href={`/${locale}/cart`}
                className="relative text-gray-700 hover:text-navy-600 transition-colors"
              >
                <div className="relative">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                    />
                  </svg>
                  {cartCount > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-coral-600 text-xs font-bold text-white">
                      {cartCount > 9 ? '9+' : cartCount}
                    </span>
                  )}
                </div>
              </Link>

              {/* Hamburger Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-gray-700 hover:text-navy-600 transition-colors p-2"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/20 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu Drawer */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-50 w-80 max-w-[85vw] bg-white shadow-2xl md:hidden transform transition-transform duration-300 ease-out ${
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Mobile Menu Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <span className="text-lg font-bold text-navy-900">Menu</span>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-gray-500 hover:text-gray-700 p-2"
              aria-label="Close menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Mobile Menu Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <nav className="space-y-1">
              {/* Language Switcher */}
              <div className="pb-4 mb-4 border-b border-gray-200">
                <LanguageSwitcher />
              </div>

              {/* Shop Link */}
              <Link
                href={`/${locale}/shop`}
                className={`block px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                  pathname.includes('/shop')
                    ? 'bg-navy-50 text-navy-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {t('shop')}
              </Link>

              {/* Admin Dashboard Link (Mobile) */}
              {isAdmin && (
                <Link
                  href={`/${locale}/admin/dashboard`}
                  className="block px-4 py-3 rounded-lg text-base font-semibold text-center bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                >
                  Go to Admin Panel
                </Link>
              )}

              {isAuthenticated ? (
                <>
                  {/* Profile Link */}
                  <Link
                    href={`/${locale}/profile`}
                    className={`block px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                      pathname.includes('/profile')
                        ? 'bg-navy-50 text-navy-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {t('profile')}
                  </Link>

                  {/* User Email */}
                  <div className="px-4 py-3">
                    <p className="text-sm text-gray-500">Signed in as</p>
                    <p className="text-sm font-medium text-gray-900 truncate">{userEmail}</p>
                  </div>

                  {/* Logout Button */}
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full text-left px-4 py-3 rounded-lg text-base font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {isLoggingOut ? tCommon('loggingOut') : tCommon('logout')}
                  </button>
                </>
              ) : (
                <>
                  {/* Sign In Link */}
                  <Link
                    href={`/${locale}/login`}
                    className="block px-4 py-3 rounded-lg text-base font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {t('signIn')}
                  </Link>

                  {/* Get Started Button */}
                  <Link
                    href={`/${locale}/signup`}
                    className="block mt-4 px-4 py-3 rounded-lg text-base font-semibold text-center bg-coral-600 text-white hover:bg-coral-500 transition-colors"
                  >
                    {t('getStarted')}
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </div>
    </>
  )
}
