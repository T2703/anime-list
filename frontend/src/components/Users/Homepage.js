import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import Navbar from '../Navbar';
import { jwtDecode } from "jwt-decode";


function Homepage() {
    const [username, setUsername] = useState('');
    const [activityFeed, setActivityFeed] = useState([]);
    const [searchInput, setSearchInput] = useState('');
    const [userId, setUserId] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const token = Cookies.get('token');
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    /**
     * The fetching of the user activity feed.
     * @param {The user ID} userId 
     */
    const fetchActivityFeed = async (userId) => {
        try {
            setLoading(true);
            await delay(300);
            const response = await fetch(`http://localhost:8081/activityFeed/${userId}`);
            const data = await response.json();
    
            if (response.ok) {
                setActivityFeed(data.activities);
                setLoading(false);
            } else {
                alert(data.message || 'Error fetching activity feed');
                setError(new Error(data.message || 'Error fetching activity feed'));
                setLoading(false);
            }
        } catch (error) {
            console.error('Error fetching activity feed:', error);
            alert('An error occurred while fetching activity feed. Please try again later.');
            setError(error);
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!token) {
            navigate('/login'); 
        } else {
            const decodedToken = jwtDecode(token);
            const userIdFromToken = decodedToken.userId;
            setUserId(userIdFromToken);
            const storedUsername = localStorage.getItem('username');

            if (storedUsername) {
                setUsername(storedUsername);
            }

            if (userIdFromToken) {
                fetchActivityFeed(userIdFromToken);
            }
        }
    }, [token, navigate]);

    if (loading) {
        return <div><Navbar /> Loading...</div>;
    }

    if (error) {
        return <div><Navbar /> Error: {error.message}</div>;
    }

    const handleSearchChange = (e) => {
        const inputValue = e.target.value.toLowerCase();
        setSearchInput(inputValue);
    };

    const filteredActivities = activityFeed.filter((activity) => {
        // Add any specific filtering logic for activity feed if needed
        return true;
    });

    return (
        <div>
            <Navbar />
            <div className="container">
                <div className="searchBar my-2 d-flex justify-content-center">
                    <div className="input-group" style={{ maxWidth: '300px' }}>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Search"
                            onChange={handleSearchChange}
                            value={searchInput}
                        />
                    </div>
                </div>
                <div className="row">
                    {filteredActivities.length > 0 ? (
                        filteredActivities.map(activity => (
                            <div className="col-md-12 mb-4" key={activity._id}>
                                <div className="card">
                                    <div className="card-body">
                                        <p className="card-text">{activity.userId} performed {activity.type}</p>
                                        {activity.type === 'addFavoriteAnime' && (
                                            <p>Added Anime: {activity.animeId}</p>
                                        )}
                                        {activity.type === 'follow' && (
                                            <>
                                                <img src={activity.mainPfp} className="profile-picture mb-4" alt="Profile" style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '50%' }} />
                                                <p>{activity.mainName} has followed you.</p>
                                            </>
                                        )}
                                        <p>{new Date(activity.timestamp).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p>No activities found.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Homepage;
