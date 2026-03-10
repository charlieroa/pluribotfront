import { Router } from 'express'
import { prisma } from '../db/client.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

const GRAPH_API = 'https://graph.facebook.com/v21.0'

function getAppCredentials() {
  const appId = process.env.FACEBOOK_APP_ID
  const appSecret = process.env.FACEBOOK_APP_SECRET
  if (!appId || !appSecret) throw new Error('FACEBOOK_APP_ID and FACEBOOK_APP_SECRET are required')
  return { appId, appSecret }
}

function getRedirectUri() {
  const base = process.env.DEPLOY_BASE_URL || 'http://localhost:5173'
  return `${base}/api/meta/callback`
}

/**
 * GET /api/meta/auth-url — Returns Facebook OAuth URL
 */
router.get('/auth-url', authMiddleware, (_req, res) => {
  try {
    const { appId } = getAppCredentials()
    const redirectUri = getRedirectUri()
    const scopes = 'ads_management,ads_read'
    const state = _req.auth!.userId

    const url = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${state}&response_type=code`

    res.json({ url })
  } catch (error) {
    console.error('[Meta] Auth URL error:', error)
    res.status(500).json({ error: 'Failed to generate auth URL' })
  }
})

/**
 * GET /api/meta/callback — OAuth callback from Facebook
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, state: userId } = req.query as { code?: string; state?: string }
    if (!code || !userId) {
      return res.status(400).send('Missing code or state')
    }

    const { appId, appSecret } = getAppCredentials()
    const redirectUri = getRedirectUri()

    // Exchange code for short-lived token
    const tokenResp = await fetch(
      `${GRAPH_API}/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`
    )
    if (!tokenResp.ok) {
      const err = await tokenResp.text()
      console.error('[Meta] Token exchange failed:', err)
      return res.redirect('/settings?section=meta&error=token_exchange')
    }
    const tokenData = await tokenResp.json() as { access_token: string; expires_in?: number }

    // Exchange for long-lived token
    const longTokenResp = await fetch(
      `${GRAPH_API}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tokenData.access_token}`
    )
    let accessToken = tokenData.access_token
    let expiresIn = tokenData.expires_in || 3600

    if (longTokenResp.ok) {
      const longData = await longTokenResp.json() as { access_token: string; expires_in?: number }
      accessToken = longData.access_token
      expiresIn = longData.expires_in || 5184000 // ~60 days
    }

    // Get user info
    const meResp = await fetch(`${GRAPH_API}/me?fields=name&access_token=${accessToken}`)
    const meData = await meResp.json() as { name?: string; id?: string }

    // Save to DB
    const expiresAt = new Date(Date.now() + expiresIn * 1000)
    await prisma.user.update({
      where: { id: userId },
      data: {
        metaAccessToken: accessToken,
        metaTokenExpiresAt: expiresAt,
        metaUserName: meData.name || null,
      },
    })

    res.redirect('/settings?section=meta&connected=true')
  } catch (error) {
    console.error('[Meta] Callback error:', error)
    res.redirect('/settings?section=meta&error=callback')
  }
})

/**
 * GET /api/meta/status — Check connection status
 */
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      select: { metaAccessToken: true, metaAdAccountId: true, metaTokenExpiresAt: true, metaUserName: true },
    })

    if (!user?.metaAccessToken) {
      return res.json({ connected: false })
    }

    res.json({
      connected: true,
      userName: user.metaUserName,
      adAccountId: user.metaAdAccountId,
      expiresAt: user.metaTokenExpiresAt,
    })
  } catch (error) {
    console.error('[Meta] Status error:', error)
    res.status(500).json({ error: 'Failed to get status' })
  }
})

/**
 * GET /api/meta/accounts — List ad accounts
 */
router.get('/accounts', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      select: { metaAccessToken: true },
    })

    if (!user?.metaAccessToken) {
      return res.status(400).json({ error: 'Meta not connected' })
    }

    const resp = await fetch(
      `${GRAPH_API}/me/adaccounts?fields=id,name,account_status,currency&access_token=${user.metaAccessToken}`
    )

    if (!resp.ok) {
      const err = await resp.text()
      console.error('[Meta] Accounts error:', err)
      return res.status(400).json({ error: 'Failed to fetch ad accounts' })
    }

    const data = await resp.json() as { data: Array<{ id: string; name: string; account_status: number; currency: string }> }

    res.json({
      accounts: data.data.map(a => ({
        id: a.id,
        name: a.name,
        status: a.account_status === 1 ? 'active' : 'inactive',
        currency: a.currency,
      })),
    })
  } catch (error) {
    console.error('[Meta] Accounts error:', error)
    res.status(500).json({ error: 'Failed to list accounts' })
  }
})

/**
 * POST /api/meta/select-account — Save selected ad account
 */
router.post('/select-account', authMiddleware, async (req, res) => {
  try {
    const { adAccountId } = req.body
    if (!adAccountId) {
      return res.status(400).json({ error: 'adAccountId required' })
    }

    await prisma.user.update({
      where: { id: req.auth!.userId },
      data: { metaAdAccountId: adAccountId },
    })

    res.json({ success: true })
  } catch (error) {
    console.error('[Meta] Select account error:', error)
    res.status(500).json({ error: 'Failed to select account' })
  }
})

/**
 * POST /api/meta/disconnect — Remove Meta connection
 */
router.post('/disconnect', authMiddleware, async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.auth!.userId },
      data: {
        metaAccessToken: null,
        metaAdAccountId: null,
        metaBusinessId: null,
        metaTokenExpiresAt: null,
        metaUserName: null,
      },
    })

    res.json({ success: true })
  } catch (error) {
    console.error('[Meta] Disconnect error:', error)
    res.status(500).json({ error: 'Failed to disconnect' })
  }
})

export default router
