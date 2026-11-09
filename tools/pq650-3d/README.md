# Блок «Устройство дрона» — исходники

Сейчас на сайте: `src/mini3.js` — разборка 3D-модели «DJI 3 mini Pro» (автор wishmaster88, Sketchfab, CC BY 4.0).
Модель сжата (meshopt + WebP) в `mini3-optimized.glb` и встроена в `docs/assets/anatomy/mini3-model.js` в base64,
чтобы сайт работал и при открытии `index.html` двойным щелчком.

Пересборка (нужен Node.js):

    npm install three@0.160.0 esbuild@0.20.2
    npx esbuild src/mini3.js --bundle --minify --format=iife --target=es2019 --legal-comments=none --outfile=../../docs/assets/anatomy/anatomy-3d.js

Узлы модели раскладываются на группы в `classify()` по именам из файла:
JY* — пропеллеры, *_电机 — моторы, xianquan*/空白* — статоры с обмотками, лучи, верхний корпус,
аккумулятор, датчики обзора, камера на подвесе.

`src/model.js` + `src/anatomy.js` — прежняя упрощённая модель PQ650, собранная кодом (не используется).
