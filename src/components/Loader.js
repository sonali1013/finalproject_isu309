import React from 'react';
import './Loader.css';

const Loader = ({ text = "Loading...", fullPage = true }) => {
  return (
    <div className={fullPage ? "full-page-loader-container" : "inline-loader-container"}>
      <img
        src="https://merchant-cboi-uat.isupay.in/images/loaderLogo-BvMsb5iC.png"
        alt="Loading"
        className="loader-spin-logo"
      />
      {text && <p className="loader-text">{text}</p>}
    </div>
  );
};

export default Loader;
