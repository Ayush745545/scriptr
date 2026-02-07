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

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [preferredLanguage, setPreferredLanguage] = useState<'en' | 'hi' | 'hinglish'>('hinglish')
  const [isLoading, setIsLoading] = useState(false)
  const { register } = useAuthStore()
  const navigate = useNavigate()

  const isDev = import.meta.env.DEV

  const handleAutofillRandom = () => {
    const id = randomId(4)
    const nextEmail = randomEmail()
    const nextPassword = randomPassword()
    setFullName(`Test User ${id}`)
    setEmail(nextEmail)
    setPassword(nextPassword)
    setConfirmPassword(nextPassword)
    toast.success('Filled random test account')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    
    setIsLoading(true)

    try {
      await register({
        email,
        password,
        full_name: fullName,
        preferred_language: preferredLanguage,
      })
      toast.success('Account created successfully!')
      navigate('/dashboard')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Registration failed. Please try again.'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Your Account</h2>
      <p className="text-gray-600 mb-6">
        Start creating viral content today
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
            Full Name
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="input-field"
            placeholder="Your name"
          />
        </div>

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
          <label htmlFor="preferredLanguage" className="block text-sm font-medium text-gray-700 mb-1">
            Preferred Language
          </label>
          <select
            id="preferredLanguage"
            value={preferredLanguage}
            onChange={(e) => setPreferredLanguage(e.target.value as 'en' | 'hi' | 'hinglish')}
            className="input-field"
          >
            <option value="hinglish">Hinglish (हिंग्लिश)</option>
            <option value="hi">हिंदी (Hindi)</option>
            <option value="en">English</option>
          </select>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="input-field"
            placeholder="At least 8 characters"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="input-field"
            placeholder="Re-enter your password"
          />
        </div>

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
              Creating account...
            </span>
          ) : (
            'Create Account'
          )}
        </button>

        {isDev && (
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleAutofillRandom}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              disabled={isLoading}
            >
              Autofill random
            </button>
            <span className="text-xs text-gray-400">Dev-only</span>
          </div>
        )}
      </form>

      <div className="mt-6 text-center">
        <p className="text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
            Sign in
          </Link>
        </p>
      </div>

      <p className="mt-4 text-xs text-gray-500 text-center">
        By creating an account, you agree to our Terms of Service and Privacy Policy
      </p>
    </div>
  )
}
