import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { GoogleCalendarService } from '@/lib/google-calendar'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const session = await getServerSession(req, res, authOptions)
  if (!session?.accessToken) {
    return res.status(401).json({ error: 'Not signed in' })
  }

  const { timeMin, timeMax } = req.body
  const cal = new GoogleCalendarService()
  cal.setCredentials({
    access_token:  session.accessToken,
    refresh_token: session.refreshToken
  })

  try {
    const items = await cal.getEvents(
      session.accessToken,
      new Date(timeMin),
      new Date(timeMax)
    )
    return res.status(200).json({ events: items })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Failed to fetch calendar events' })
  }
}
