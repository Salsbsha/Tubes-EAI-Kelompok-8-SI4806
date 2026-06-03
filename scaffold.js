const fs = require('fs');
const path = require('path');

const services = [
    { name: 'registrasi', port: 3001, deps: { express: "^4.18.2", mysql2: "^3.6.5", amqplib: "^0.10.3" } },
    { name: 'rekam-medis', port: 3002, deps: { express: "^4.18.2", mysql2: "^3.6.5", amqplib: "^0.10.3" } },
    { name: 'farmasi', port: 3003, deps: { express: "^4.18.2", mysql2: "^3.6.5", amqplib: "^0.10.3", xml2js: "^0.6.2", "body-parser-xml": "^2.0.3" } },
    { name: 'billing', port: 3004, deps: { express: "^4.18.2", mysql2: "^3.6.5", amqplib: "^0.10.3" } },
    { name: 'api-gateway', port: 3000, deps: { express: "^4.18.2", amqplib: "^0.10.3", xml2js: "^0.6.2", axios: "^1.6.2" } }
];

services.forEach(svc => {
    const dir = path.join(__dirname, svc.name);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // package.json
    const pkg = {
        name: svc.name,
        version: "1.0.0",
        description: `Microservice for ${svc.name}`,
        main: "index.js",
        scripts: { "start": "node index.js" },
        dependencies: svc.deps
    };
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg, null, 2));

    // Dockerfile
    const dockerfile = `FROM node:18-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE ${svc.port}
CMD [ "npm", "start" ]
`;
    fs.writeFileSync(path.join(dir, 'Dockerfile'), dockerfile);

    // index.js
    const indexJs = `const express = require('express');
const app = express();
app.use(express.json());

app.get('/', (req, res) => {
    res.json({ service: '${svc.name}', status: 'ready' });
});

const PORT = process.env.PORT || ${svc.port};
app.listen(PORT, () => {
    console.log('${svc.name} service running on port ' + PORT);
});
`;
    fs.writeFileSync(path.join(dir, 'index.js'), indexJs);
});

console.log("Semua skeleton berhasil dibuat.");
