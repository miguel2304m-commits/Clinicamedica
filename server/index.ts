import { app } from "./app";
const port = Number(process.env.PORT ?? 3001);
app.listen(port, "127.0.0.1", () =>
  console.log(`Clínica Integrada: http://127.0.0.1:${port}`),
);
