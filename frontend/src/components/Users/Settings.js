import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from "react-router-dom";
import Navbar from '../Navbar';
import Cookies from 'js-cookie';
import { jwtDecode } from "jwt-decode";
import Croppie from 'croppie';

function Settings() {
    const [userId, setUserId] = useState('');
    const navigate = useNavigate();
    const [newUsername, setNewUsername] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newBio, setNewBio] = useState('');
    const [newPFP, setNewPFP] = useState(null);
    const [password, setPassword] = useState('');
    const [profilePicture, setProfilePicture] = useState('');
    const [email, setEmail] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showModalCrop, setShowModalCrop] = useState(false);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [isPrivate, setIsPrivate] = useState(false);
    const token = Cookies.get('token');
    const croppieRef = useRef(null);
    const [croppieInstance, setCroppieInstance] = useState(null); 
    const [croppedImage, setCroppedImage] = useState(''); 

    useEffect(() => {
        if (token) {
            const decodedToken = jwtDecode(token);
            setUserId(decodedToken.userId);
            setEmail(localStorage.getItem('email') || '');
            fetchUsersID(decodedToken.userId)
        } else {
            navigate('/login');
        }
    }, []);

    const fetchUsersID = async (userId) => {
        try {
            const response = await fetch(`http://localhost:8081/userById/${userId}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
    
            if (!response.ok) {
                throw new Error('Failed to fetch users');
            }
            
            const data = await response.json();
            setIsPrivate(data.isPrivate);
            console.log(isPrivate)

            setNewUsername(data.username);
            setProfilePicture(data.profilePicture);
            setNewEmail(data.email);
            setNewBio(data.bio);
        
        } catch (error) {
            console.error('Error fetching data:', error);
        }
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

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            if (newUsername) formData.append('username', newUsername);
            if (newEmail) formData.append('email', newEmail);
            if (newBio) formData.append('bio', newBio);
            if (croppedImage) {
                const blob = base64ToBlob(croppedImage);
                formData.append('profilePic', blob, 'profilePic.png');
            } else if (profilePicture) {
                // Use the existing profile picture if no new one is selected
                formData.append('profilePic', profilePicture);
            }
            formData.append('isPrivate', isPrivate);
    
            const response = await fetch(`http://localhost:8081/updateAccount/${userId}`, {
                method: 'PUT',
                headers: { 'authorization': `Bearer ${token}` },
                body: formData
            });
    
            const data = await response.json();
            if (response.ok) {
                alert("Your information has been updated.");
                if (newUsername.trim() !== '') localStorage.setItem('username', newUsername);
                if (newEmail.trim() !== '') localStorage.setItem('email', newEmail);
                if (newBio.trim() !== '') localStorage.setItem('bio', newBio);
                if (croppedImage) localStorage.setItem('profilePicture', data.user.profilePicture);
                setProfilePicture(croppedImage || profilePicture); // Set profile picture to either cropped or existing
                setShowUpdateModal(false);
                setPassword(""); 
            } else {
                alert(data.message || 'Error updating profile');
            }
        } catch (error) {
            console.error('ERROR:', error);
        }
    };

    const handleDelete = async (e) => {
      e.preventDefault();

      try {
          const response = await fetch('http://localhost:8081/login', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({ email, password }),
          });
          if (response.ok) {

              const responseData = await response.json();
              await fetch(`http://localhost:8081/deleteAccount/${userId}`, {
                  method: 'DELETE',
                  headers: { 'content-type': 'application/json', 'authorization': `Bearer ${token}` },
                  body: JSON.stringify({ "_id": userId })
              });
              Cookies.remove('token');

              localStorage.removeItem('username');
              localStorage.removeItem('email');
              localStorage.removeItem('bio');
              localStorage.removeItem('profilePicture');

              alert("User deleted!");
              navigate('/login');
          } else {
              // Password incorrect, show error message
              const errorData = await response.json();
              alert(errorData.message || 'Password incorrect');
          }
      } catch (error) {
          alert("An error has occurred.");
          console.error('ERROR:', error);
      }
  };

  const handleProfilePicClick = () => {
    document.getElementById('newPFP').click(); 
};

const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            setShowModalCrop(true);
            
            setTimeout(() => {
                if (croppieInstance) {
                    croppieInstance.destroy();
                    setCroppieInstance(null);
                    
                }
                if (croppieRef.current) {  // Ensure the modal is rendered and the croppieRef is not null
                    const newCroppie = new Croppie(croppieRef.current, {
                        viewport: { width: 200, height: 200, type: 'circle' },
                        boundary: { width: 300, height: 300 },
                        enableOrientation: true,
                    });

                    newCroppie.bind({ url: event.target.result });
                    setCroppieInstance(newCroppie); // Save the new instance
                }
            }, 50);  // Give time for the modal and ref to be rendered
        };
        reader.readAsDataURL(file);
    }
    e.target.value = '';
};

const handleCrop = () => {
    if (croppieInstance) {
        croppieInstance.result({
            type: 'base64',
            size: 'viewport',
            quality: 1
        }).then((result) => {
            setCroppedImage(result);
            setNewPFP(result);
            croppieInstance.destroy(); 
            setCroppieInstance(null);
        });
        setShowModalCrop(false);
    }
};
    

  return (
    <div>
        <Navbar />
        <div className="container mt-5">
            <div className="row justify-content-center">
                <div className="col-md-6">
                    <div className="card">
                        <div className="card-body">
                            <h1 className="card-title text-center mb-4">Update Account</h1>
                            <form onSubmit={(e) => { e.preventDefault(); setShowUpdateModal(true); }}>
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
                                    </div>
                                <div className="mb-3">
                                    <label htmlFor="newUsername" className="form-label">Username:</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        id="newUsername"
                                        value={newUsername}
                                        onChange={(e) => setNewUsername(e.target.value)}
                                    />
                                </div>
                                <div className="mb-3">
                                    <label htmlFor="newEmail" className="form-label">Email:</label>
                                    <input
                                        type="email"
                                        className="form-control"
                                        id="newEmail"
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                    />
                                </div>
                                <div className="mb-3">
                                    <label htmlFor="newBio" className="form-label">Bio:</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        id="newBio"
                                        value={newBio}
                                        onChange={(e) => setNewBio(e.target.value)}
                                    />
                                </div>
                                <div className="form-group mb-3">
                                <label for="private">Privacy:</label>
                                    <select name="private" id="private" value={isPrivate} onChange={(e) => setIsPrivate(e.target.value === 'true')}>
                                    <option value="false">Public</option>
                                    <option value="true">Private</option>
                                    </select>
                                </div>
                                <div className="text-center mt-3">
                                    <button type="submit" className="btn btn-success">Update</button>
                                </div>
                            </form>
                            <div className="text-center mt-3">
                                <button type="button" className="btn btn-danger" onClick={() => setShowModal(true)}>Delete</button>
                            </div>
                        </div>
                    </div>
                    <div className={`modal ${showModal ? "d-block" : "d-none"}`} tabIndex="-1" role="dialog" style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}>
                        <div className="modal-dialog" role="document">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">Confirm Deletion</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    <p>Are you sure you want to delete your account?</p>
                                    <input
                                        type="password"
                                        className="form-control mb-3"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-danger" onClick={handleDelete}>Yes</button>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => {
                                            setShowModal(false);
                                            setPassword(""); 
                                        }}
                                    >
                                        No
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className={`modal ${showUpdateModal ? "d-block" : "d-none"}`} tabIndex="-1" role="dialog" style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}>
                        <div className="modal-dialog" role="document">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">Confirm Deletion</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowUpdateModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    <p>Enter your password to update your account</p>
                                    <input
                                        type="password"
                                        className="form-control mb-3"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-danger" onClick={handleUpdateUser}>Yes</button>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => {
                                            setShowUpdateModal(false);
                                            setPassword(""); 
                                        }}
                                    >
                                        No
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className={`modal ${showModalCrop ? "d-block" : "d-none"}`} tabIndex="-1" role="dialog" style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}>
                        <div className="modal-dialog" role="document">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">Crop Image</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowModalCrop(false)}></button>
                                </div>
                                <div className="modal-body">
                                    <div ref={croppieRef}></div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-primary" onClick={handleCrop}>Crop</button>
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowModalCrop(false)}>Cancel</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);
}

export default Settings;