import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Cookies from "js-cookie";
import Navbar from '../Navbar';
import { jwtDecode } from "jwt-decode";
import '../../styles/Loader.css';

function Following() {
  const [users, setUsers] = useState([]);
  const { userId } = useParams();
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [followedUsers, setFollowedUsers] = useState([]);
  const [requestedUsers, setRequestedUsers] = useState([]);
  const navigate = useNavigate();
  const token = Cookies.get('token');
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const itemsPerPage = 30;
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchRequestedUsers = async () => {
    try {
      setLoading(true);
      await delay(300);
        const response = await fetch('http://localhost:8081/allUsers', {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch users');
        }
        
        const data = await response.json();
        const requestedUsers = data.filter(user => user.pendingRequests && user.pendingRequests.includes(loggedInUser));
        
        setRequestedUsers(requestedUsers || []);
        setLoading(false);
    } catch (error) {
        console.error('Error fetching data:', error);
        setError(error);
        setLoading(false);
    }
};

const fetchFollowing = async (userId) => {
  try {
    const response = await fetch(`http://localhost:8081/getFollowing/${userId}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }

    const data = await response.json();

    // Fetch logged-in user's blocked users if logged in
    if (loggedInUser) {
      const userResponse = await fetch(`http://localhost:8081/userById/${loggedInUser}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!userResponse.ok) {
        throw new Error('Failed to fetch logged-in user data');
      }

      const loggedInUserData = await userResponse.json();
      const blockedUsers = loggedInUserData.blockedUsers || [];

      // Filter out blocked users from the following list
      const filteredFollowing = data.following.filter(
        followingUser => !blockedUsers.includes(followingUser._id)
      );

      setUsers(filteredFollowing);
      setFollowedUsers(filteredFollowing);  // assuming `setFollowedUsers` is to be the filtered following list
    } else {
      // If there's no logged-in user, just set the unfiltered following list
      setUsers(data.following || []);
      setFollowedUsers(data.following || []);
    }

    console.log(data);

  } catch (error) {
    console.error('Error fetching data:', error);
  }
};

useEffect(() => {
  fetchFollowing(userId);
  fetchRequestedUsers();
    if (token) {
      try {
        const decodedToken = jwtDecode(token);
        setLoggedInUser(decodedToken.userId);
        console.log(loggedInUser);
      }
      catch (error) {
        console.error("Error decoding token:", error);
        Cookies.remove('token'); 
      }
    }
}, [token, navigate, loggedInUser]);

const handleSearchChange = (e) => {
    //const inputValue = e.target.value.toLowerCase();
    setSearchInput(e.target.value.toLowerCase());
    //setCurrentPage(1);
}

const filteredUsers = users.filter((user) => {
    return user.username.toLowerCase().includes(searchQuery.toLowerCase());
});

const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
    }
};

const handlePreviousPage = () => {
    handlePageChange(currentPage - 1);
};

const handleNextPage = () => {
    handlePageChange(currentPage + 1);
};

const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    setSearchQuery(searchInput);
};

if (loading) {
  return <div><Navbar /> <div className="loader"></div></div>;
}


if (error) {
  return <div><Navbar /> Error: {error.message}</div>;
}


const indexOfLastItem = currentPage * itemsPerPage;
const indexOfFirstItem = indexOfLastItem - itemsPerPage;
const currentItems = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

const handleFollow = async (targetUserId) => {
  if (!token) {
    alert("Please login or register to follow a user.");
    return;
 }
    try {
        const response = await fetch(`http://localhost:8081/follow/${targetUserId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        setUsers(prevUsers => {
            return prevUsers.map(user => {
                if (user._id === targetUserId) {
                    return { ...user, followers: [...user.followers, loggedInUser] };
                }
                return user;
            });
        });

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
  if (!token) {
    alert("Please login or register to follow a user.");
    return;
 }
    try {
        const response = await fetch(`http://localhost:8081/unfollow/${targetUserId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Include the user's JWT token for authentication
            }
        });

        setUsers(prevUsers => {
            return prevUsers.map(user => {
                if (user._id === targetUserId) {
                    return { ...user, followers: user.followers.filter(id => id !== loggedInUser) };
                }
                return user;
            });
        });

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
      <form onSubmit={handleSearchSubmit} className="searchBar my-2 d-flex justify-content-center">
        <div className="input-group" style={{ maxWidth: '300px' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search for users"
            onChange={handleSearchChange}
            value={searchInput}
          />
          <button type="submit" className="btn btn-primary">Search</button>
        </div>
      </form>
      <div className="row m-0">
        {currentItems.length > 0 ? (
          currentItems.map(user => (
            <div key={user._id} className="col-lg-3 col-md-4 col-sm-6 mb-4">
              <div className="card recipe-card" style={{ maxWidth: "360px" }}>
                <h5 className="card-title text-center">{user.username}</h5>
                <div className="profile-picture-container d-flex justify-content-center align-items-center">
                  <img
                    src={user.profilePicture}
                    className="card-img-top img-fluid rounded-circle"
                    alt={user.username}
                    style={{ height: "200px", width: "200px", objectFit: "cover", cursor: 'pointer'  }}
                    onClick={() => navigate(`/profile/${user._id}`)}
                  />
                </div> {/* Properly closing the div here */}
                {user._id !== loggedInUser ? (
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    {user.followers.includes(loggedInUser) ? (
                      <button
                        className="btn btn-danger"
                        onClick={() => handleUnfollow(user._id)}
                        style={{ width: "100px", marginTop: "10px" }}
                      >
                        Unfollow
                      </button>
                    ) : user.pendingRequests && user.pendingRequests.includes(loggedInUser) ? (
                      <button
                        className="btn btn-secondary"
                        style={{ width: "100px", marginTop: "10px" }}
                        disabled
                      >
                        Requested
                      </button>
                    ) : (
                      <button
                        className="btn btn-success"
                        onClick={() => handleFollow(user._id)}
                        style={{ width: "100px", marginTop: "10px" }}
                      >
                        Follow
                      </button>
                    )}
                  </div>
                ) : null}
                <div className="card-body text-center"></div>
              </div>
            </div>
          ))
        ) : (
          <p>No users found.</p>
        )}
        <div className="pagination d-flex justify-content-center mt-3">
          <button
            className="btn btn-primary mx-1"
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <button
            className="btn btn-primary mx-1"
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  </div>
);  
};

export default Following;