import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from 'react-router-dom';
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import Navbar from '../Navbar';
import '../../styles/Loader.css';
import '../../styles/AnimeInfo.css';

function AnimeInfo() {
    const { animeID } = useParams();
    const [email, setEmail] = useState('');
    const [userId, setUserId] = useState('');
    const [animeType, setAnimeType] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [favoriteAnimes, setFavoriteAnimes] = useState([]);
    const [isFavorite, setIsFavorite] = useState(false);
    const navigate = useNavigate();
    const token = Cookies.get('token');
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    useEffect(() => { 
        if (token) {
            try {
                const decodedToken = jwtDecode(token);
                const userIdFromToken = decodedToken.userId;
                setUserId(userIdFromToken);
                setEmail(localStorage.getItem('email') || '');
        
                if (userIdFromToken) {
                    fetchFavoriteAnimes(userIdFromToken);
                }
            }
            catch (error) {
                console.error("Error decoding token:", error);
                Cookies.remove('token');
            }
        }
        
    }, [token, navigate]);

    /**
     * The fetching of the user favorite anime.
     * @param {The user ID} userId 
     */
    const fetchFavoriteAnimes = async (userId) => {
        try {
            await delay(360);
            const response = await fetch(`http://localhost:8081/getFavoriteAnimes/${userId}`);
            const data = await response.json();
            console.log(response);
    
            if (response.ok) {
                const favoriteAnimes = data.favoriteAnimes || [];
                setFavoriteAnimes(favoriteAnimes);

                const isFavoriteAnime = favoriteAnimes.some(anime => anime.id === parseInt(animeID, 10));
                setIsFavorite(isFavoriteAnime);
            } else {
                alert(data.message || 'Error fetching favorite animes');
            }
        } catch (error) {
            console.error('Error fetching favorite animes:', error);
            alert('An error occurred while fetching favorite animes. Please try again later.');
        }
    };
    
    /**
     * Anime favorite api call.
     * @param {Anime they want} anime 
     */
    const handleFavoriteAnime = async (anime, userId) => {
        if (!token) {
            alert("Please login or register to favortie an anime.");
            return;
        }
        try {
            const response = await fetch(`http://localhost:8081/addFavoriteAnime/${userId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: email, anime: anime }),
            });
    
            if (response.ok) {
                setFavoriteAnimes([...favoriteAnimes, anime]);
                setIsFavorite(true);
            } else {
                // Error adding anime to favorites
                const errorData = await response.json();
                alert(errorData.message || 'Error adding anime to favorites');
            }
        } catch (error) {
            console.error('Error adding anime to favorites:', error);
            alert('An error occurred while adding anime to favorites. Please try again later.');
        }
    };

    /**
     * Removing the anime API call.
     * @param {Anime they want} anime 
     */
    const handleRemoveAnime = async (anime) => {
        if (!token) {
            alert("Please login or register to favortie an anime.");
            return;
        }
        try {
            const response = await fetch('http://localhost:8081/removeAnime', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: email, anime: anime }),
            });
    
            if (response.ok) {
                setFavoriteAnimes(favoriteAnimes.filter(a => a.id !== anime.id));
                setIsFavorite(false);
            } else {
                const errorData = await response.json();
                alert(errorData.message || 'Error removing anime');
            }
        } catch (error) {
            console.error('Error removing anime:', error);
            alert('An error occurred while adding anime to favorites. Please try again later.');
        }
    };
    

    const fetchAnime = () => {
        const query = `
        query ($id: Int) {
            Media (id: $id, type: ANIME) {
                id
                title {
                    romaji
                    english
                }
                coverImage {
                    large
                    medium
                }
                averageScore
                status
                episodes
                description
            }
        }
        `;

        const variables = {
            id: animeID
        };

        const urlAnime = 'http://localhost:8081/graphql';
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                query: query,
                variables: variables
            })
        };

        setLoading(true);

        fetch(urlAnime, options)
            .then(response => response.json())
            .then(data => {
                setAnimeType(data.data.Media);
                setLoading(false);
            })
            .catch(error => {
                setError(error);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchAnime();
    }, [animeID]);

    if (loading) {
        return <div><Navbar /> <div className="loader"></div></div>;
    }

    if (error) {
        return <div><Navbar /> Error: {error.message}</div>;
    }

    return (
        <div>
            <Navbar />
            <div className="containerAnime">
                <div className="row d-flex align-items-start">
                    {animeType ? (
                        <>
                            <div className="col-md-4 mb-4">
                                <img
                                    src={animeType.coverImage.large}
                                    className=  "card-img-top"
                                    alt={animeType.title.romaji}
                                    style={{ width: '100%', maxWidth: '350px', height: 'auto' }} 
                                />
                            </div>
                            <div className="col-md-8 mb-4">
                                <div className="card h-100">
                                    <h3 className="card-title text-center">{animeType.title.english || animeType.title.romaji}</h3>
                                    <div className="card-body text-center">
                                        <p className="card-text"><strong>Average Score:</strong> {animeType.averageScore}</p>
                                        <p className="card-text"><strong>Status:</strong> {animeType.status}</p>
                                        <p className="card-text"><strong>Episodes:</strong> {animeType.episodes}</p>
                                        <p className="card-text">{animeType.description.replace(/<[^>]+>/g, '')}</p>
                                    </div>
                                    <div className="card-footer text-center">
                                        {isFavorite ? (
                                            <button className="btn btn-danger ml-2" onClick={() => handleRemoveAnime(animeType, userId)}>
                                                Unfavorite
                                            </button>
                                        ) : (
                                            <button className="btn btn-success ml-2" onClick={() => handleFavoriteAnime(animeType, userId)}>
                                                Favorite
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <p>No anime data found.</p>
                    )}
                </div>
            </div>
        </div>
    );
    
}

export default AnimeInfo;
