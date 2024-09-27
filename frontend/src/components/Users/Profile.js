import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Cookies from "js-cookie";
import Navbar from '../Navbar';
import { jwtDecode } from "jwt-decode";

function Profile() {
    const [username, setUsername] = useState('');
    const [users, setUsers] = useState([]);
    const [followingCount, setFollowingCount] = useState(0);
    const [followerCount, setFollowerCount] = useState(0);
    const [followers, setFollowers] = useState([]);
    const [followedUsers, setFollowedUsers] = useState([]);
    const [requestedUsers, setRequestedUsers] = useState([]);
    const [profilePicture, setProfilePicture] = useState('');
    const [bio, setBio] = useState('');
    const [favoriteAnimes, setFavoriteAnimes] = useState([]);
    const [searchInput, setSearchInput] = useState('');
    const { userId } = useParams();
    const [loggedUserId, setLoggedUserId] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState("");
    const [isPrivate, setIsPrivate] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;
    const token = Cookies.get('token');
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const fetchFavoriteAnimes = async (userId) => {
        try {
            setLoading(true);
            await delay(300);
            const response = await fetch(`http://localhost:8081/getFavoriteAnimes/${userId}`);
            const data = await response.json();
    
            if (response.ok) {
                const favoriteAnimes = data.favoriteAnimes || [];
                favoriteAnimes.sort((a, b) => {
                    const titleA = (a.title.english || a.title.romaji).toLowerCase();
                    const titleB = (b.title.english || b.title.romaji).toLowerCase();
                    return titleA.localeCompare(titleB);
                });
                setFavoriteAnimes(favoriteAnimes);
                setLoading(false);
            } else {
                alert(data.message || 'Error fetching favorite animes');
                setError(new Error(data.message || 'Error fetching favorite animes'));
                setLoading(false);
            }
        } catch (error) {
            console.error('Error fetching favorite animes:', error);
            alert('An error occurred while fetching favorite animes. Please try again later.');
            setError(error);
            setLoading(false);
        }
    };

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
          setUsername(data.username);
          setProfilePicture(data.profilePicture);
          setFollowingCount(data.following.length);
          setFollowerCount(data.followers.length);
          setFollowers(data.followers);
          setBio(data.bio);
          setIsPrivate(data.isPrivate);
          console.log(data)
          
          const isFollowingUser = data.followers.includes(loggedUserId);
          const hasSentFollowRequest = data.pendingRequests && data.pendingRequests.includes(loggedUserId);
    
          setFollowedUsers(isFollowingUser ? [data] : []);
          setRequestedUsers(hasSentFollowRequest ? [data] : []);
      } catch (error) {
          console.error('Error fetching data:', error);
      }
  };

    useEffect(() => {
        if (!token) {
            navigate('/login'); 
        } else {
            fetchUsersID(userId);
            fetchFavoriteAnimes(userId);

            const decodedToken = jwtDecode(token);
            const userIdFromToken = decodedToken.userId;
            setLoggedUserId(userIdFromToken);
        }
    }, [token, navigate, users]);

    if (loading) {
        return <div><Navbar /> Loading...</div>;
    }

    if (error) {
        return <div><Navbar /> Error: {error.message}</div>;
    }


    const filteredFavoriteAnimes = favoriteAnimes.filter((anime) => {
        const title = (anime.title.english || anime.title.romaji).toLowerCase();
        return title.includes(searchQuery);
    });

    const isFollower = followers.some(follower => follower === loggedUserId);
    const isProfileOwner = loggedUserId === userId;

    const handleFollow = async (targetUserId) => {
        const userToFollow = users.find(user => user._id === targetUserId);
        

        if (targetUserId.isPrivate) {
            alert("A request has been sent.");
        }
      
        try {
            const response = await fetch(`http://localhost:8081/follow/${targetUserId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
      
            if (response.ok) {
                setUsers(prevUsers => prevUsers.map(user => {
                    if (user._id === targetUserId) {
                        return {
                            ...user,
                            pendingRequests: [...(user.pendingRequests || []), loggedUserId] 
                        };
                    }
                    return user;
                }));
      
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
    
            setUsers(prevUsers => {
                return prevUsers.map(user => {
                    if (user._id === targetUserId) {
                        return { ...user, followers: user.followers.filter(id => id !== loggedUserId) };
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

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredFavoriteAnimes.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredFavoriteAnimes.length / itemsPerPage);

    const handleSearchChange = (e) => {
        const inputValue = e.target.value.toLowerCase();
        setSearchInput(inputValue);
    };

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

    return (
        <div>
            <Navbar />
            <div className="container mt-4">
                <div className="row">
                    <div className="col-md-4">
                        <div className="text-center">
                            <img src={profilePicture} className="profile-picture mb-4" alt="Profile" style={{ width: '200px', height: '200px', objectFit: 'cover', borderRadius: '50%' }} />
                            <h3>{username}</h3>
                            {isPrivate && !isProfileOwner && !isFollower  ? (
                                <div className="alert alert-info text-center"></div>
                            ) : (
                                <>
                                    <p>{bio}</p>
                                    <p onClick={() => navigate(`/followers/${userId}`)}>Followers: {followerCount}</p>
                                    <p onClick={() => navigate(`/following/${userId}`)}>Following: {followingCount}</p>
                                </>
                            )}
                        </div>
                        {!isProfileOwner && (
                <>
                    {isFollower ? (
                        <button 
                            className="btn btn-danger" 
                            onClick={() => handleUnfollow(userId)}
                        >
                            Unfollow
                        </button>
                    ) : requestedUsers.some(user => user._id === userId) ? (
                        <button className="btn btn-secondary" disabled>
                            Request Sent
                        </button>
                    ) : (
                        <button 
                            className="btn btn-primary" 
                            onClick={() => handleFollow(userId)}
                        >
                            Follow
                        </button>
                    )}
                </>
            )}
                    </div>
                    <div className="col-md-8">
                        {isPrivate && !isProfileOwner && !isFollower ? (
                            <div className="alert alert-info text-center">
                                This profile is private.
                            </div>
                        ) : (
                            <>
                                <form onSubmit={handleSearchSubmit} className="searchBar my-2 d-flex justify-content-center">
                                    <div className="input-group" style={{ maxWidth: '400px' }}>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Search for anime"
                                            onChange={handleSearchChange}
                                            value={searchInput}
                                        />
                                        <button type="submit" className="btn btn-primary">Search</button>
                                    </div>
                                </form>
                                <div className="row">
                                    {currentItems.length > 0 ? (
                                        currentItems.map(anime => (
                                            <div className="col-md-6 mb-4" key={anime.id}>
                                                <div className="card">
                                                    <h5 className="card-title text-center">{anime.title.english || anime.title.romaji}</h5>
                                                    <img src={anime.coverImage.large} className="card-img-top" alt={anime.title.romaji} />
                                                    <div className="card-body text-center">
                                                        <button className="btn btn-primary" onClick={() => navigate(`/animeinfo/${anime.id}`)}>View</button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center">No anime found.</p>
                                    )}
                                </div>
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
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Profile;
