import { Router } from 'express';

const router = Router();

// Routes temporaires
router.post('/login', (req, res) => {
  const { orgCode, pseudonym } = req.body;

  if (orgCode === 'VAUBAN' && pseudonym === 'admin') {
    return res.json({
      success: true,
      token: 'test-token-vauban',
      user: {
        id:           '123',        // <- user.id
        pseudonym:    'admin',
        frenchCode:   'VAUBAN',
        orgId:        'org-123',    // <- user.orgId doit matcher organization.id
        role:         'user'
      },
      organization: {
        id:     'org-123',          // <- organization.id
        name:   'Vauban Security',
        code:   'VAUBAN',
        sector: 'défense',
        size:   42
      }
    });
  }

  return res
    .status(401)
    .json({ success: false, message: 'Identifiants invalides' });
});




export default router;