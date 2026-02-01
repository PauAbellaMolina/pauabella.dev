import { Link } from 'react-router-dom';
import '../assets/css/fonts.css';
import '../App.css';
import { useState } from 'react';
import { ReactComponent as PauAvatar } from '../assets/svg/pauavatar.svg';
import type { ColorPalette } from '../types';

function Home() {
  const defaultColorPalette: ColorPalette = {
    text: `#0f4c81`,
    background: `transparent`
  };
  const [colorPalette, setColorPalette] = useState<ColorPalette>(defaultColorPalette);

  const setNewRandomColorPalette = () => {
    const randomColorPalette: ColorPalette = {
      text: getRandomColor(),
      background: getRandomColor()
    };
    setColorPalette(randomColorPalette);
  };

  const getRandomColor = () => {
    const r = generateRandomRGB();
    const g = generateRandomRGB();
    const b = generateRandomRGB();
    return `rgb(${r}, ${g}, ${b})`;
  };

  const generateRandomRGB = () => {
    return Math.floor(Math.random() * 256);
  }

  return (
    <div className="App" style={{backgroundColor: colorPalette.background, color: colorPalette.text}}>
      <PauAvatar className="pauAvatarSvg" onClick={setNewRandomColorPalette} />
      <div className="header">
        <h1>Pau Abella</h1>
        <div className="contactPlaces">
          <a href='https://linkedin.com/in/pauabellamolina'>LinkedIn</a>
          <a href='https://github.com/PauAbellaMolina'>GitHub</a>
          <a href='mailto:pauabellamolina1@gmail.com'>Email</a>
        </div>
      </div>
      <div className='content'>
        <span>
          <p>I'm a Software Engineer & Product Designer currently building the</p>
          <p>AI-powered nurse assistant at <Link className="link" to="https://teton.ai">Teton</Link>.</p>
        </span>
        <span>
          <p>On my free time, I like to <Link className="link" to="/bikepack">bikepack</Link> around Denmark.</p>
        </span>
        <span>
          <p>Previously built <Link className="link" to="/norda">Norda Tickets</Link> as a side project, had great fun trying to go to market with it.</p>
          <p>On a hiatus for now.</p>
        </span>
      </div>
    </div>
  );
}

export default Home;
