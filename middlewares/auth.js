const jwt = require("jsonwebtoken");
const { promisify } = require("util");

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  // console.log('middleware')

  if (!authHeader) {
    return res.status(401).send({ error: "No token provided" });
  }

  const [scheme, token] = authHeader.split(" ");

  try {
    const decoded = await promisify(jwt.verify)(token, "secret");

    req.userId = decoded.id;

    return next();
  } catch (err) {
    console.log('erro auth')
    console.log(err)
    return res.status(401).send({ error: "Token invalid" });
  }
};
