import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'

export default function ProfilePage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const handleLogout = () => {
    logout()
    toast.success('Logged out')
    navigate('/login')
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-600 mt-1">Manage your account details</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {user ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Name</span>
              <span className="font-medium text-gray-900">{user.full_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Email</span>
              <span className="font-medium text-gray-900">{user.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Language</span>
              <span className="font-medium text-gray-900 capitalize">{user.preferred_language}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Plan</span>
              <span className="font-medium text-gray-900 capitalize">{user.subscription_tier}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Credits</span>
              <span className="font-medium text-gray-900">{user.credits_remaining}</span>
            </div>
          </div>
        ) : (
          <div className="text-gray-600">
            Profile details will appear here after you log in.
          </div>
        )}

        <div className="flex items-center justify-end pt-6">
          <button type="button" onClick={handleLogout} className="btn-secondary">
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}
