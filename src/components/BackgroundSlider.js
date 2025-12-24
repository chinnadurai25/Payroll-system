import React, { useState, useEffect } from 'react';
import '../styles/BackgroundSlider.css';

// Import images
import bg1 from '../assets/bg-1.png';
import bg2 from '../assets/bg-2.png';
import bg3 from '../assets/bg-3.png';

const BackgroundSlider = () => {
    const images = [bg1, bg2, bg3];
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
        }, 5000); // Change image every 5 seconds

        return () => clearInterval(interval);
    }, [images.length]);

    return (
        <div className="background-slider">
            {images.map((image, index) => (
                <div
                    key={index}
                    className={`slide ${index === currentIndex ? 'active' : ''}`}
                    style={{ backgroundImage: `url(${image})` }}
                >
                    <div className="overlay"></div>
                </div>
            ))}
        </div>
    );
};

export default BackgroundSlider;
