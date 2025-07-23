import { supabase } from '@/integrations/supabase/client'

/**
 * Debug function to check emails in database
 * Run this in browser console: await window.debugEmails()
 */
export async function debugEmails(userId?: string) {
  try {
    console.log('🔍 Starting email debug...')

    // Get current user if not provided
    if (!userId) {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        console.error('❌ No authenticated user')
        return
      }
      userId = user.id
    }

    console.log(`📧 Checking emails for user: ${userId}`)

    // 1. Check email accounts
    const { data: emailAccounts, error: accountError } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('user_id', userId)

    if (accountError) {
      console.error('❌ Error fetching email accounts:', accountError)
      return
    }

    console.log(`📨 Found ${emailAccounts?.length || 0} email accounts:`)
    emailAccounts?.forEach(account => {
      console.log(`  - ${account.email} (ID: ${account.id}, enabled: ${account.sync_enabled})`)
    })

    if (!emailAccounts || emailAccounts.length === 0) {
      console.log('❌ No email accounts found')
      return
    }

    // 2. Check emails for each account
    for (const account of emailAccounts) {
      console.log(`\n📊 Checking emails for account: ${account.email}`)

      const {
        data: emails,
        error: emailError,
        count,
      } = await supabase
        .from('emails')
        .select('id, subject, date, from_email', { count: 'exact' })
        .eq('user_id', userId)
        .eq('email_account_id', account.id)
        .order('date', { ascending: false })
        .limit(5)

      if (emailError) {
        console.error(`❌ Error fetching emails for ${account.email}:`, emailError)
        continue
      }

      console.log(`  📈 Total emails: ${count}`)

      if (emails && emails.length > 0) {
        const oldest = await supabase
          .from('emails')
          .select('date')
          .eq('user_id', userId)
          .eq('email_account_id', account.id)
          .order('date', { ascending: true })
          .limit(1)
          .single()

        const newest = emails[0] // Already sorted desc

        console.log(`  📅 Date range: ${oldest.data?.date} → ${newest.date}`)
        console.log(`  📝 Recent emails:`)
        emails.forEach((email, i) => {
          console.log(`    ${i + 1}. ${email.date} - ${email.subject} (from: ${email.from_email})`)
        })
      } else {
        console.log(`  📭 No emails found`)
      }
    }

    // 3. Check specific contact if provided
    const contactEmail = 'wilberto@salessheet.io' // From the error logs
    console.log(`\n🎯 Checking emails for contact: ${contactEmail}`)

    const {
      data: contactEmails,
      error: contactError,
      count: contactCount,
    } = await supabase
      .from('emails')
      .select('id, subject, date, from_email, to_emails', { count: 'exact' })
      .eq('user_id', userId)
      .or(
        `from_email.eq.${contactEmail},to_emails.cs.["${contactEmail}"],cc_emails.cs.["${contactEmail}"],bcc_emails.cs.["${contactEmail}"]`,
      )
      .order('date', { ascending: false })
      .limit(10)

    if (contactError) {
      console.error(`❌ Error fetching emails for ${contactEmail}:`, contactError)
    } else {
      console.log(`  📊 Emails with ${contactEmail}: ${contactCount}`)
      contactEmails?.forEach((email, i) => {
        console.log(`    ${i + 1}. ${email.date} - ${email.subject} (from: ${email.from_email})`)
      })
    }

    console.log('\n✅ Email debug complete!')
  } catch (error) {
    console.error('💥 Debug failed:', error)
  }
}

// Make it available globally
if (typeof window !== 'undefined') {
  ;(window as any).debugEmails = debugEmails
}
