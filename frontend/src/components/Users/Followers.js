import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Cookies from "js-cookie";
import Navbar from '../Navbar';
import { jwtDecode } from "jwt-decode";

function Followers() {
  const [users, setUsers] = useState([]);
  const [following, setFollowing] = useState([]); 
  const { userId } = useParams();
  const navigate = useNavigate();
  const token = Cookies.get('token');
  const [searchInput, setSearchInput] = useState("");

  const fetchFollowers = async (userId) => {
    try {
        const response = await fetch(`http://localhost:8081/getFollowers/${userId}`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch users');
        }
        
        const data = await response.json();
        setUsers(data.followers || []);
        setFollowing(data.following || []);
        console.log(data);
    } catch (error) {
        console.error('Error fetching data:', error);
    }
};

useEffect(() => {
    if (!token) {
        navigate('/login'); 
    } else {
        /*const decodedToken = jwtDecode(token);
        const userIdFromToken = decodedToken.userId;
        setUserId(userIdFromToken);*/
        fetchFollowers(userId);
    }
}, [token, navigate]);

const handleSearchChange = (e) => {
    const inputValue = e.target.value.toLowerCase();
    setSearchInput(inputValue);
}

const filteredUsers = users.filter((user) => {
    return user.username.toLowerCase().includes(searchInput);
});

const handleFollow = async (targetUserId) => {
    try {
        const response = await fetch(`http://localhost:8081/follow/${targetUserId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        /*setUsers(prevUsers => {
            return prevUsers.map(user => {
                if (user._id === targetUserId) {
                    return { ...user, followers: [...user.followers, loggedInUser] };
                }
                return user;
            });
        });*/

        console.log(response)

        if (response.ok) {
            console.log('User followed successfully');
        } else {
            const errorData = await response.json();
            console.error('Follow user error:', errorData.message || 'Failed to follow user');
        }
    } catch (error) {
        console.error('Error following user:', error);
    }
};

const handleUnfollow = async (targetUserId) => {
    try {
        const response = await fetch(`http://localhost:8081/unfollow/${targetUserId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Include the user's JWT token for authentication
            }
        });

        /*setUsers(prevUsers => {
            return prevUsers.map(user => {
                if (user._id === targetUserId) {
                    return { ...user, followers: user.followers.filter(id => id !== loggedInUser) };
                }
                return user;
            });
        });*/

        if (response.ok) {
            console.log('User unfollowed successfully');
        } else {
            const errorData = await response.json();
            console.error('Unfollow user error:', errorData.message || 'Failed to unfollow user');
        }
    } catch (error) {
        console.error('Error unfollowing user:', error);
    }
};

return (
    <div className="App">
        <Navbar />
        <div>
            <div className="row m-0">
                <div className="searchBar my-2 d-flex justify-content-center">
                    <div className="input-group" style={{ maxWidth: '300px' }}>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Search for users"
                            onChange={handleSearchChange}
                            value={searchInput}
                        />
                    </div>
                </div>
                {filteredUsers.map(user => (
                    <div key={user._id} className="col-lg-3 col-md-4 col-sm-6 mb-4">
                        <div className="card recipe-card" style={{ maxWidth: "360px" }}>
                            <h5 className="card-title text-center">{user.username}</h5>
                            <div className="profile-picture-container d-flex justify-content-center align-items-center">
                                <img
                                    src={user.profilePicture}
                                    className="card-img-top img-fluid rounded-circle"
                                    alt={user.username}
                                    style={{ height: "200px", width: "200px", objectFit: "cover" }}
                                />
                                <button className="btn btn-primary ml-2" onClick={() => handleFollow(user._id)}>Follow</button>
                                <button className="btn btn-primary ml-2" onClick={() => handleUnfollow(user._id)}>unfollow</button>
                            </div>
                            <div className="card-body text-center">
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);
};

export default Followers;