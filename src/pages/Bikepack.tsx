import '../assets/css/fonts.css';
import '../App.css';
import BP1 from '../assets/images/bp1.webp';
import BP2 from '../assets/images/bp2.webp';
import BP3 from '../assets/images/bp3.webp';
import BP4 from '../assets/images/bp4.webp';
import BP5 from '../assets/images/bp5.webp';
import BP6 from '../assets/images/bp6.webp';
import BP7 from '../assets/images/bp7.webp';
import BP8 from '../assets/images/bp8.webp';
import BP9 from '../assets/images/bp9.webp';
import BP10 from '../assets/images/bp10.webp';
import BP11 from '../assets/images/bp11.webp';
import BP12 from '../assets/images/bp12.webp';
import { useNavigate } from 'react-router-dom';

function Bikepack() {
  const navigate = useNavigate();

  const handleHover = (e: React.MouseEvent<HTMLImageElement>) => {
    const rotation = (Math.random() * 3 - 1.5).toFixed(2);
    e.currentTarget.style.setProperty('--hover-rotate', `${rotation}deg`);
  };

  return (
    <div className="App">
      <h2 className="floating-navigation" onClick={() => navigate('/')}>Pau Abella</h2>
      <div className="centered-header">
        <h1>On the bike</h1>
      </div>
      <div className='sparse-grid-content'>
        <img src={BP1} alt="I love tiny single paths like this" onMouseEnter={handleHover} />
        <img src={BP2} alt="Packing up" onMouseEnter={handleHover} />
        <img src={BP3} alt="I wanted to check out the beach" onMouseEnter={handleHover} />
        <img src={BP4} alt="Green!" onMouseEnter={handleHover} />
        <img src={BP5} alt="So fast" onMouseEnter={handleHover} />
        <img src={BP6} alt="Found this randomly, it was really cool" onMouseEnter={handleHover} />
        <img src={BP7} alt="Swedish hills" onMouseEnter={handleHover} />
        <img src={BP8} alt="Rainy day, flowers on the back" onMouseEnter={handleHover} />
        <img src={BP9} alt="Didn't pause Strava on the ferry" onMouseEnter={handleHover} />
        <img src={BP10} alt="Found this creepy looking house, turned out it was just an old windmill" onMouseEnter={handleHover} />
        <img src={BP11} alt="Me!" onMouseEnter={handleHover} />
        <img src={BP12} alt="On a small lake close to Copenhagen" onMouseEnter={handleHover} />
      </div>
    </div>
  );
}

export default Bikepack;
