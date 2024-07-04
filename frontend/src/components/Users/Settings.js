import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import Navbar from '../Navbar';
import Cookies from 'js-cookie';
import { jwtDecode } from "jwt-decode";

function Settings() {
    const [userId, setUserId] = useState('');
    const navigate = useNavigate();
    const [newUsername, setNewUsername] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newBio, setNewBio] = useState('');
    const [newPFP, setNewPFP] = useState(null);
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [isPrivate, setIsPrivate] = useState(false);
    const token = Cookies.get('token');

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

            /*setUsername(data.username);
            setProfilePicture(data.profilePicture);
            setBio(data.bio);*/
        
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            if (newUsername) formData.append('username', newUsername);
            if (newEmail) formData.append('email', newEmail);
            if (newBio) formData.append('bio', newBio);
            if (newPFP) formData.append('profilePic', newPFP);
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
                if (newPFP) localStorage.setItem('profilePicture', data.user.profilePicture);
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

    


  return (
    <div>
        <Navbar />
        <div className="container mt-5">
            <div className="row justify-content-center">
                <div className="col-md-6">
                    <div className="card">
                        <div className="card-body">
                            <h1 className="card-title text-center mb-4">Update Account</h1>
                            <form onSubmit={handleUpdateUser}>
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
                                    <label htmlFor="newPFP" className="form-label">Profile Picture:</label>
                                    <input
                                        type="file"
                                        className="form-control"
                                        id="newPFP"
                                        onChange={(e) => setNewPFP(e.target.files[0])}
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
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>No</button>
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