import React from 'react';
import {useNavigate} from 'react-router-dom';

/**
 * It as it states, the first page nothing special.
 * @returns The landing page.
 */
function Landing() {
  const navigate = useNavigate();

  return (
    <div className="container-fluid p-0 my-background">
      <div className="row no-gutters align-items-center landing-container m-0">
        <div className="col-12 col-md-6 d-flex justify-content-start">
          <div className="text-wrapper p-4">
            <h1>Discover your favorite animes.</h1>
            <button className="btn btn-success me-1" onClick={() => navigate("/register")}>Sign Up</button>
            <button className="btn btn-dark" onClick={() => navigate("/login")}>Log In</button>
          </div>
        </div>
        <div className="col-12 col-md-6">
        </div>
      </div>
    </div>
  )
};

export default Landing;