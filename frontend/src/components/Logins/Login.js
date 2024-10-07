import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from 'react-router-dom';
import Cookies from "js-cookie";

/**
 * It's the login page, you can pretty much guess what this does.
 * @returns Login page.
 */
function Login() {
    const [userId, setUserId] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();
    
    /**
     * The call to make to the api from MONGODB,
     * In other words how the login actually functions.
     * @param {event} e 
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
    
        try {
            const response = await fetch('http://localhost:8081/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId, email, password })
            });
    
            if (response.ok) {
                const data = await response.json();
                const { username, email, profilePicture, bio, token } = data;
                console.log(data);

                Cookies.set("token", token)

                localStorage.setItem('username', username);
                localStorage.setItem('email', email);
                localStorage.setItem('profilePicture', profilePicture);
                localStorage.setItem('bio', bio);
                localStorage.setItem('searchInput', "");
                localStorage.setItem('page', 1);

                navigate('/homepage');
            } else {
                alert("Login is incorrect");
                throw new Error("Login failed.");
            }
        } catch (error) {
            console.error('Login error:', error);
        }
    };

    return (
        <div className="container">
            <div className="row justify-content-center mt-5">
                <div className="col-md-6">
                    <div className="card">
                        <div className="card-body">
                            <h2 className="text-center mb-4">Login</h2>
                            <form onSubmit={handleSubmit}>
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
                                <div className="text-center mt-3">
                                    <button type="submit" className="btn btn-success btn-block">Login</button>
                                </div>
                            </form>
                            <div className="text-center mt-3">
                                <Link to="/register">Register here.</Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Login;
