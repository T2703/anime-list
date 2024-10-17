import React, { useState, useRef } from "react";
import Croppie from 'croppie';
import { useNavigate, Link } from "react-router-dom";

function Register() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [profilePicture, setProfilePicture] = useState(null);
    const croppieRef = useRef(null);
    const [croppieInstance, setCroppieInstance] = useState(null); 
    const [croppedImage, setCroppedImage] = useState(''); 
    const navigate = useNavigate();
    
    const handleRegisterSubmit = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            alert("Passwords don't match");
            return;
        }

        try {
            const formData = new FormData();
            formData.append('username', username);
            formData.append('email', email);
            formData.append('password', password);
            if (croppedImage) {
                const blob = base64ToBlob(croppedImage);
                formData.append('profilePic', blob, 'profilePic.png'); // Note: The key must match the key used in multer.single()
            }

            const response = await fetch('http://localhost:8081/register', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {  
                navigate('/login');
            } else {
                const errorData = await response.json();
                alert(errorData.message || 'Registration failed');
            }
        } catch (error) {
            console.error('Error during registration:', error);
            alert('An error occurred while registering. Please try again later.');
        }
    };

    const handleProfilePicClick = () => {
        document.getElementById('newPFP').click(); 
    };

    const base64ToBlob = (base64) => {
        const byteString = atob(base64.split(',')[1]);
        const mimeString = base64.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        return new Blob([ab], { type: mimeString });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                
                const newCroppie = new Croppie(croppieRef.current, {
                    viewport: { width: 200, height: 200, type: 'circle' },
                    boundary: { width: 300, height: 300 },
                    enableOrientation: true,
                });
    
                newCroppie.bind({ url: event.target.result });
                setCroppieInstance(newCroppie); // Save the new instance
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleCrop = () => {
        if (croppieInstance) {
            croppieInstance.result({
                type: 'base64',
                size: 'viewport',
                quality: 1
            }).then((result) => {
                setCroppedImage(result);
                setProfilePicture(result);
                croppieInstance.destroy(); 
            });
        }
    };

    return (
        <div className="container">
            <div className="row justify-content-center mt-5">
                <div className="col-md-6">
                    <div className="card">
                        <div className="card-body">
                            <h2 className="text-center mb-4">Join In To Start Sharing & Finding</h2>
                            <form onSubmit={handleRegisterSubmit}>
                            <div className="text-center mb-3">
                                        <img
                                            src={croppedImage || profilePicture || "https://static.vecteezy.com/system/resources/previews/009/292/244/original/default-avatar-icon-of-social-media-user-vector.jpg"}
                                            alt="Profile"
                                            onClick={handleProfilePicClick}
                                            className="img-fluid rounded-circle"
                                            style={{ cursor: 'pointer', width: '150px', height: '150px', objectFit: 'cover' }}
                                        />
                                        <input
                                            type="file"
                                            id="newPFP"
                                            onChange={handleFileChange}
                                            style={{ display: 'none' }}
                                            accept="image/png, image/jpeg"
                                        />
                                        <div ref={croppieRef}></div> 
                                        {croppieInstance && (
                                        <button type="button" className="btn btn-primary mt-2" onClick={handleCrop}>
                                            Crop
                                        </button>
                                    )}
                                    </div>
                                <div className="form-group">
                                    <label>Username:</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Email:</label>
                                    <input
                                        type="email"
                                        className="form-control"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Password:</label>
                                    <input
                                        type="password"
                                        className="form-control"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Confirm Password:</label>
                                    <input
                                        type="password"
                                        className="form-control"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="text-center mt-3">
                                    <button type="submit" className="btn btn-success btn-block">Register</button>
                                </div>
                            </form>
                            <div className="text-center mt-3">
                                <Link to="/login">Already have an account? Login!</Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Register;
