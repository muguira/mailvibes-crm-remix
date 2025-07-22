import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth'
import { TopNavbar } from '@/components/layout/top-navbar'
import { CustomButton } from '@/components/ui/custom-button'
import { toast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { logger } from '@/utils/logger'

export default function Profile() {
  const { user } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)

  // Fetch user profile on component mount
  useEffect(() => {
    async function fetchProfile() {
      if (!user) return

      try {
        setIsFetching(true)
        const { data, error } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single()

        if (error) throw error

        if (data) {
          setFirstName(data.first_name || '')
          setLastName(data.last_name || '')
        }
      } catch (error: any) {
        logger.error('Error fetching profile:', error)
        toast({
          title: 'Error',
          description: 'Failed to load profile data',
          variant: 'destructive',
        })
      } finally {
        setIsFetching(false)
      }
    }

    fetchProfile()
  }, [user])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return

    setIsLoading(true)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) throw error

      toast({
        title: 'Profile updated',
        description: 'Your profile has been successfully updated',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen bg-slate-light/20">
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNavbar />

        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-sm">
            <h1 className="text-2xl font-bold text-navy-deep mb-6">Your Profile</h1>

            <div className="mb-6">
              <p className="text-slate-medium">Email</p>
              <p className="font-semibold">{user?.email}</p>
            </div>

            {isFetching ? (
              <div className="p-4 text-center">Loading profile data...</div>
            ) : (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="firstName" className="text-sm font-medium text-slate-dark">
                      First Name
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      className="w-full p-2 border border-slate-light rounded focus:outline-none focus:ring-2 focus:ring-teal-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="lastName" className="text-sm font-medium text-slate-dark">
                      Last Name
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      className="w-full p-2 border border-slate-light rounded focus:outline-none focus:ring-2 focus:ring-teal-primary"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <CustomButton type="submit" isLoading={isLoading}>
                    Update Profile
                  </CustomButton>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
