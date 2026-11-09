# PQ650 3D — исходники блока «Устройство дрона»

Стилизованная 3D-модель PQ650, собранная кодом (Three.js r160), и сцена с разборкой по прокрутке.

- `src/model.js` — модель: корпус, панели, аккумулятор, полётный контроллер, лучи, моторы, пропеллеры, подвес, опоры.
- `src/anatomy.js` — сцена: прокрутка → разборка, вращение мышью/пальцем, номер активной детали.

Сборка (нужен Node.js):

    npm install
    npx esbuild src/anatomy.js --bundle --minify --format=iife --target=es2019 --legal-comments=none --outfile=../../docs/assets/anatomy/pq650-anatomy.js

Когда появится CAD/GLB-модель, её можно загрузить через GLTFLoader в `anatomy.js` вместо `buildPQ650()`, сохранив те же имена узлов (props, motors, arms, cover, battery, fc, sides, gimbal, gear).
