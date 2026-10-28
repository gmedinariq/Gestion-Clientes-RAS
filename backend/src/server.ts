import { crearApp } from './app';
import { config } from './config';

crearApp().listen(config.port, () => {
  console.log(`API escuchando en http://localhost:${config.port}`);
});
