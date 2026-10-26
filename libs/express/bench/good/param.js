const express = require('express');

const app = express();
const router = express.Router();

async function loadItem(req, res, next, id) {
  req.item = { id };
  next();
}

router.param('id', loadItem);
router.param('slug', loadItem);

router.get('/item/:id', (req, res) => {
  res.status(200).json(req.item);
});

app.use('/api', router);
app.listen(3000, (error) => {
  if (error) throw error;
});

module.exports = app;
