import { redirect } from 'next/navigation'

// Redirect profile to settings page to consolidate functionality
export default function ProfilePage() {
  redirect('/profile/settings')
}