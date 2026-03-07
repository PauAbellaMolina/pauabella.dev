import { Link, useNavigate } from 'react-router-dom';
import '../assets/css/fonts.css';
import '../App.css';

function Norda() {
  const navigate = useNavigate();

  return (
    <div className="App">
      <h2 className="floating-navigation" onClick={() => navigate('/')}>Pau Abella</h2>
      <div className="header">
        <h1>Norda Tickets</h1>
        <div className="contactPlaces">
          <a href='https://nordatickets.com'>Landing Page</a>
          <a href='https://instagram.com/nordatickets'>Instagram</a>
          <a href='https://www.linkedin.com/company/nordatickets'>LinkedIn</a>
          <a href='mailto:hello@nordatickets.com'>Email</a>
        </div>
      </div>
      <div className='content'>
        <span>
          <p>Check it out <Link className="link" target="_blank" to="https://nordatickets.com">here</Link></p>
        </span>
        <span>
          <p>Boosting event revenues by digitising the sale and management of tickets, drinks and consumables at concerts and festivals.</p>
        </span>
        <span>
          <p>The best purchase experience for attendees—no lines, no cash, just buy your drink using your phone</p>
        </span>
      </div>
    </div>
  );
}

export default Norda;
