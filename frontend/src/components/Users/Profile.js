import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Cookies from "js-cookie";
import Navbar from '../Navbar';
import { jwtDecode } from "jwt-decode";

function Profile() {
    const [username, setUsername] = useState('');
    const [followingCount, setFollowingCount] = useState(0);
    const [followerCount, setFollowerCount] = useState(0);
    const [followers, setFollowers] = useState([]);
    const [profilePicture, setProfilePicture] = useState('');
    const [bio, setBio] = useState('');
    const [favoriteAnimes, setFavoriteAnimes] = useState([]);
    const [searchInput, setSearchInput] = useState('');
    const { userId } = useParams();
    const [loggedUserId, setLoggedUserId] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
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
          
          //const followingUsers = data.filter(user => user.followers.includes(loggedInUser));
      
          //setFollowedUsers(followingUsers || []);
          //console.log(followedUsers)
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

    const filteredFavoriteAnimes = favoriteAnimes.filter((anime) => {
        const title = (anime.title.english || anime.title.romaji).toLowerCase();
        return title.includes(searchInput);
    });

    const isFollower = followers.some(follower => follower === loggedUserId);
    const isProfileOwner = loggedUserId === userId;

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredFavoriteAnimes.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredFavoriteAnimes.length / itemsPerPage);

    const handlePageChange = (page) => {
        setCurrentPage(page);
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
                    </div>
                    <div className="col-md-8">
                        {isPrivate && !isProfileOwner && !isFollower ? (
                            <div className="alert alert-info text-center">
                                This profile is private.
                            </div>
                        ) : (
                            <>
                                <div className="searchBar my-2 d-flex justify-content-center">
                                    <div className="input-group" style={{ maxWidth: '400px' }}>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Search for anime"
                                            onChange={handleSearchChange}
                                            value={searchInput}
                                        />
                                    </div>
                                </div>
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
                                    {Array.from({ length: totalPages }, (_, index) => (
                                        <button
                                            key={index + 1}
                                            className={`btn btn-primary mx-1 ${currentPage === index + 1 ? 'active' : ''}`}
                                            onClick={() => handlePageChange(index + 1)}
                                        >
                                            {index + 1}
                                        </button>
                                    ))}
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
