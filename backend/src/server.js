require("dotenv").config();

const app = require("./app");

const porta = process.env.PORT || 3000;

app.listen(porta, () => {
  console.log(`API no ar em http://localhost:${porta}`);
  console.log(`Para conferir, abra http://localhost:${porta}/saude`);
});
