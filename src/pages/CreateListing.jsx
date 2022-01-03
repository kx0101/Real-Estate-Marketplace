import {useState, useEffect, useRef } from 'react'
import {getAuth, onAuthStateChanged} from 'firebase/auth'
import {getStorage, ref, uploadBytesResumable, getDownloadURL} from 'firebase/storage'
import {addDoc, collection, serverTimestamp} from 'firebase/firestore'
import {db} from "../firebase.config"
import {useNavigate} from 'react-router-dom'
import Spinner from '../components/Spinner'
import {v4 as uuidv4} from 'uuid'
import { toast } from 'react-toastify'

function CreateListing() {
    const [geolocationEnabled, setGeolocationEnabled] = useState(false)
    const [loading, setLoading] = useState(false) 

    //Default settings for a creating
    const [formData, setFormData] = useState({
        type: "rent",
        name: "",
        bedrooms: 1,
        bathrooms: 1,
        parking: false,
        furnished: false,
        address: "",
        offer: false,
        regularPrice: 0,
        discountedPrice: 0,
        images: {},
        latitude: 0,
        longitude: 0
    })

    const {
        type, 
        name, 
        bedrooms, 
        bathrooms, 
        parking, 
        furnished, 
        address, 
        offer, 
        regularPrice, 
        discountedPrice, 
        images, 
        latitude, 
        longitude
    } = formData

    const auth = getAuth()
    const navigate = useNavigate()
    const isMounted = useRef(true)

    useEffect(() => {
        if(isMounted){
            onAuthStateChanged(auth, (user) => {
                if(user) {
                    setFormData({...formData, userRef: user.uid})
                } else {
                    navigate("/sign-in")
                }
            })
        }

        return () => {
            isMounted.current = false
        }
    }, [isMounted])

    const onSubmit = async (e) => {
        e.preventDefault()

        setLoading(true)

        if(discountedPrice >= regularPrice) {
            setLoading(false)
            toast.error("Discounted price can't be higher than regular price.")
            return
        }

        if(images.length > 6) {
            setLoading(false)
            toast.error("You can't upload more than 6 pictures.")
            return
        }

        let geolocation = {}
        let location

        if(geolocationEnabled) {
            const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${process.env.REACT_APP_GEOCODE_API_KEY}`)

            const data = await response.json()

            geolocation.lat = data.results[0]?.geometry.location.lat ?? 0
            geolocation.lng = data.results[0]?.geometry.location.lng ?? 0

            location = data.status === "ZERO_RESULTS" ? undefined : data.results[0]?.formatted_address

            if(location === undefined || location.includes('undefined')) {
                setLoading(false)
                toast.error("Please check your address again")
                return
            } 
        } else {
            geolocation.lat = latitude
            geolocation.lng = longitude
        }

        // Storing the image in Firebase (loop for more) some c/p from firebase docs :')
        const storeImage = async (image) => {
            return new Promise((resolve, reject) => {
                const storage = getStorage()
                const fileName = `${auth.currentUser.uid}-${image.name}-${uuidv4()}` //Unique id

                const storageRef = ref(storage, 'images/' + fileName)

                const uploadTask = uploadBytesResumable(storageRef, image)

                uploadTask.on('state_changed', 
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        console.log('Upload is ' + progress + '% done');
                        switch (snapshot.state) {
                        case 'paused':
                            console.log('Upload is paused');
                            break;
                        case 'running':
                            console.log('Upload is running');
                            break;
                        }
                    }, 
                    (error) => {
                        reject(error)
                    }, 
                    () => {

                        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                        resolve(downloadURL);
                        });
                    }
                );
            })
        }

        const imgUrls = await Promise.all(
            [...images].map((image) => storeImage(image))
        ).catch(() => {
            setLoading(false)
            toast.error("Images did not upload")
            return
        })


        const formDataCopy = {
            ...formData,
            imgUrls,
            geolocation,
            timestamp: serverTimestamp()
        }

        formDataCopy.location = address
        delete formDataCopy.images
        delete formDataCopy.address
        !formDataCopy.offer && delete formDataCopy.discountedPrice //since there's no offer

        const docRef = await addDoc(collection(db, 'listings'), formDataCopy)

        setLoading(false)
        toast.success("Listing saved!")
        navigate(`/category/${formDataCopy.type}/${docRef.id}`)
    }

    const onMutate = (e) => {
        let boolean = null

        if(e.target.value === "true") {
            boolean = true
        }
        if(e.target.value === "false") {
            boolean = false
        }

        // For Files
        if(e.target.files) {
            setFormData((prevState) => ({
                ...prevState,
                images: e.target.files
            }))
        }

        // For Texts or Booleans or Numbers
        if(!e.target.files) {

            setFormData((prevState) => ({
                ...prevState,
                [e.target.id]: boolean ?? e.target.value
            }))
        }
    }

    if(loading) {
        return <Spinner />
    }

    return (
        <div className="profile">
            <header>
                <p className="pageHeader">Create a Listing</p>
            </header>

            <main>
                <form onSubmit={onSubmit}>
                    <label className="formLabel">Sell / Rent</label>
                    <div className="formButtons">
                        <button type="button" 
                        className={type === "sale" ? 'formButtonActive' : 'formButton'}
                        id="type"
                        value='sale'
                        onClick={onMutate}>
                            Sell
                        </button>
                        <button type="button" 
                        className={type === "rent" ? 'formButtonActive' : 'formButton'}
                        id="type"
                        value='rent'
                        onClick={onMutate}>
                            Rent
                        </button>
                    </div>

                    <label className="formLabel">Name</label>
                    <input 
                    type="text"
                    className="formInputName"
                    id="name"
                    value={name}
                    onChange={onMutate}
                    maxLength="32"
                    minLength="10"
                    required
                     />

                    <div className="formButtons flex">
                        <div>
                            <label className="formLabel">Bedrooms</label>
                                <input 
                                    type="number"
                                    className="formInputSmall"
                                    id="bedrooms"
                                    value={bedrooms}
                                    onChange={onMutate}
                                    min="1"
                                    max="50"
                                    required
                                    /> 
                        </div>
                    </div>
                        <div>
                        <label className="formLabel">Bathrooms</label>
                            <input 
                                type="number"
                                className="formInputSmall"
                                id="bathrooms"
                                value={bathrooms}
                                onChange={onMutate}
                                min="1"
                                max="50"
                                required
                                /> 
                        </div>
                        <label className="formLabel">Parking spot</label>
                            <div className="formButtons">
                                <button type="button" 
                                    className={parking ? 'formButtonActive' : 'formButton'}
                                    id="parking"
                                    value={true}
                                    onClick={onMutate}
                                    min="1"
                                    max="50">
                                    Yes
                                </button>
                                <button type="button" 
                                    className={!parking && parking !== null ?
                                         'formButtonActive' : 'formButton'}
                                    id="parking"
                                    value={false}
                                    onClick={onMutate}>
                                    No
                                </button>
                            </div>
                        
                        <label className="formLabel">Furnished</label>
                            <div className="formButtons">
                                <button type="button" 
                                    className={furnished ? 'formButtonActive' : 'formButton'}
                                    id="furnished"
                                    value={true}
                                    onClick={onMutate}>
                                    Yes
                                </button>
                                <button type="button" 
                                    className={!furnished && furnished !== null ?
                                         'formButtonActive' : 'formButton'}
                                    id="furnished"
                                    value={false}
                                    onClick={onMutate}>
                                    No
                                </button>
                            </div>

                        <label className="formLabel">Address</label>
                        <textarea
                            className="formInputAddress"
                            type="text"
                            id="address"
                            value={address}
                            onChange={onMutate}
                            required />

                        {!geolocationEnabled && (
                            <div className="formLatLng flex">
                                <div>
                                    <label className="formLabel">Latitude</label>
                                    <input type="number" 
                                    className="formInputSmall"
                                    id="latitude"
                                    value={latitude}
                                    onChange={onMutate}
                                    required />
                                </div>
                                <div>
                                    <label className="formLabel">Longitude</label>
                                    <input type="number" 
                                    className="formInputSmall"
                                    id="longitude"
                                    value={longitude}
                                    onChange={onMutate}
                                    required />
                                </div>
                            </div>
                        )}

                        <label className="formLabel">Offer</label>
                        <div className="formButtons">
                            <button className={offer ? 'formButtonActive' : 'formButton'}
                                    type="button"
                                    id="offer"
                                    value={true}
                                    onClick={onMutate}
                                    >
                                        Yes
                            </button>
                            <button className={!offer && offer !== null ? 'formButtonActive' : 'formButton'}
                                    type="button"
                                    id="offer"
                                    value={false}
                                    onClick={onMutate}
                                    >
                                        No
                            </button>
                        </div>

                        <label className='formLabel'>Regular Price</label>
                            <div className='formPriceDiv'>
                                <input
                                className='formInputSmall'
                                type='number'
                                id='regularPrice'
                                value={regularPrice}
                                onChange={onMutate}
                                min='50'
                                max='750000000'
                                required
                                />
                                {type === 'rent' && <p className='formPriceText'>$ / Month</p>}
                            </div>

                            {offer && (
                                <>
                                <label className='formLabel'>Discounted Price</label>
                                <input
                                    className='formInputSmall'
                                    type='number'
                                    id='discountedPrice'
                                    value={discountedPrice}
                                    onChange={onMutate}
                                    min='50'
                                    max='750000000'
                                    required={offer}
                                />
                                </>
                            )}

                        <label className="formLabel">Images</label>
                        <p className="imagesInfo">The first image will be the cover (Max images: 6) Accepting jpg png or jpeg only!</p>
                        <input 
                            type="file"
                            className="formInputFile"
                            id="images"
                            onChange={onMutate}
                            max="6"
                            accept=".jpg,.png,.jpeg"
                            multiple
                            required 
                        />
                        <button type="submit" 
                        className="primaryButton createListingButton">Create Listing</button>
                </form>
            </main>
        </div>
    )
}

export default CreateListing
