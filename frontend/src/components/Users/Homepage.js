import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import Navbar from '../Navbar';
import { jwtDecode } from "jwt-decode";
import { formatDistanceToNow } from 'date-fns';
import '../../styles/Loader.css';

function Homepage() {
    const [username, setUsername] = useState('');
    const [activityFeed, setActivityFeed] = useState([]);
    const [searchInput, setSearchInput] = useState('');
    const [userId, setUserId] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const [filterType, setFilterType] = useState('');
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
                console.log(userId);
                console.log(activityFeed);
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

    const acceptRequestCall = async (requestId) => {
        try {
            const response = await fetch(`http://localhost:8081/acceptFollowRequest/${requestId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
    
            if (response.ok) {
                console.log('Follow request accepted successfully');
                setActivityFeed(prevActivities =>
                    prevActivities.filter(activity => activity._id !== requestId)
                );
            } else {
                const errorData = await response.json();
                console.error('Error accepting follow request:', errorData.message || 'Failed to accept follow request');
            }
        } catch (error) {
            console.error('Error accepting follow request:', error);
        }
    };


    const rejectedRequestCall = async (requestId) => {
        try {
            const response = await fetch(`http://localhost:8081/rejectFollowRequest/${requestId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
    
            if (response.ok) {
                console.log('Follow request rejected successfully');
                setActivityFeed(prevActivities =>
                    prevActivities.filter(activity => activity._id !== requestId)
                );
            } else {
                const errorData = await response.json();
                console.error('Error rejecting follow request:', errorData.message || 'Failed to accept follow request');
            }
        } catch (error) {
            console.error('Error rejecting follow request:', error);
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

    const filteredActivities = filterType
    ? activityFeed.filter(activity => activity.type === filterType)
    : activityFeed;

    if (loading) {
        return <div><Navbar /> <div className="loader"></div></div>;
    }

    if (error) {
        return <div><Navbar /> Error: {error.message}</div>;
    }

    return (
        <div>
            <Navbar />
            <div className="container mt-4">
                <div className="filter-buttons mb-4 text-center">
                    <button className="btn btn-primary" onClick={() => setFilterType('')}>All</button>
                    <button className="btn btn-primary" onClick={() => setFilterType('addFavoriteAnime')}>Favorite Anime</button>
                    <button className="btn btn-primary" onClick={() => setFilterType('follow')}>Follow</button>
                    <button className="btn btn-primary" onClick={() => setFilterType('followRequest')}>Follow Request</button>
                </div>
    
                <div className="row">
                    {filteredActivities.length > 0 ? (
                        filteredActivities.map(activity => (
                            <div className="col-md-12 mb-4" key={activity._id}>
                                <div className="card shadow-sm rounded-lg border-0" style={{ overflow: 'hidden' }}>
                                    <div className="card-body d-flex align-items-center">
                                        <img
                                            src={activity.mainPfp}
                                            className="rounded-circle mr-3"
                                            alt="Profile"
                                            style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                                            onClick={() => navigate(`/profile/${activity.userId}`)}
                                        />
                                        <div className="activity-text">
                                            {activity.type === 'addFavoriteAnime' && (
                                                <>
                                                    <p className="mb-2">
                                                        <strong>{activity.mainName}</strong> has added: <strong>{activity.animeTitle.english}</strong> to their favorites.
                                                    </p>
                                                    <img
                                                        src={activity.animeImage}
                                                        className="rounded"
                                                        alt="Anime Cover"
                                                        style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                                                        onClick={() => navigate(`/animeinfo/${activity.animeId}`)}
                                                    />
                                                </>
                                            )}
                                            {activity.type === 'follow' && (
                                                <>
                                                    <p className="mb-2"><strong>{activity.mainName}</strong> has followed you.</p>
                                                </>
                                            )}
                                            {activity.type === 'followRequest' && (
                                                <>
                                                    <p className="mb-2"><strong>{activity.mainName}</strong> has requested to follow you.</p>
                                                    <div>
                                                        <button className="btn btn-outline-success btn-sm mr-2" onClick={() => acceptRequestCall(activity._id)}>Accept</button>
                                                        <button className="btn btn-outline-danger btn-sm" onClick={() => rejectedRequestCall(activity._id)}>Decline</button>
                                                    </div>
                                                </>
                                            )}
                                            <p className="text-muted mt-2">{formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center">No activities found.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Homepage;
