const express = require('express');
const router = express.Router();

router.post('/login', async (req, res) => {
  const ok = await checkPassword(req.body.email, req.body.password);
  if (!ok) {
    return res.redirect('/login?error=1', 302);
  }
  req.session.user = req.body.email;
  res.redirect('back');
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/', 301);
  });
});

async function checkPassword(email, password) {
  return Boolean(email && password);
}

module.exports = router;
