import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

function randomId(length = 8) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const values = new Uint32Array(length)
  crypto.getRandomValues(values)
  let out = ''
  for (let i = 0; i < length; i++) {
    out += alphabet[values[i] % alphabet.length]
  }
  return out
}

function randomEmail() {
  return `test+${Date.now()}-${randomId(6)}@example.com`
}

function randomPassword() {
  return `Test@${randomId(10)}!`
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuthStore()
  const navigate = useNavigate()

  const isDev = import.meta.env.DEV

  const handleAutofillRandom = () => {
    setEmail(randomEmail())
    setPassword(randomPassword())
    toast.success('Filled random test credentials')
  }

  const handleQuickLogin = async () => {
    try {
      const e = randomEmail()
      const p = randomPassword()
      setEmail(e)
      setPassword(p)
      setIsLoading(true)
      await login(e, p)
      toast.success('Logged in (test)')
      navigate('/dashboard')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Login failed. Please try again.'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await login(email, password)
      toast.success('Welcome back!')
      navigate('/dashboard')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Login failed. Please try again.'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h2>
      <p className="text-gray-600 mb-6">
        Sign in to continue creating content
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input-field"
            placeholder="your@email.com"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700">
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="input-field"
            placeholder="••••••••"
          />
        </div>

        {isDev && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={handleAutofillRandom}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                disabled={isLoading}
              >
                Autofill random
              </button>
              <button
                type="button"
                onClick={handleQuickLogin}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                disabled={isLoading}
              >
                Quick login
              </button>
            </div>
            <span className="text-xs text-gray-400">Dev-only</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Signing in...
            </span>
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-gray-600">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
            Sign up free
          </Link>
        </p>
      </div>

      {/* Demo credentials hint */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-500 text-center">
          <span className="font-medium">Tip:</span> In dev, use “Autofill random” for quick testing
        </p>
      </div>
    </div>
  )
}
