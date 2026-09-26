const express = require("express"); // importe de Express

const app = express(); // ejecutamos express y obtenemos un servidor

const PORT = 3000; // guarda el puerto para ejecutar

app.use(express.json()); // Para que express interprete el JSON

app.post("/pokemon", (req, res) => { // Crea una ruta HTTP
    const { name } = req.body;

    console.log("Pokemon recibido:", name);

    res.kson({
        message: "Pokemon recibido correctamente",
        name: name,
    });
});

app.listen(PORT, () => {
  console.log(`Microservicio ejecutándose en http://localhost:${PORT}`);
});