import {useState} from 'react'
import {Link, useNavigate} from 'react-router-dom'
import {ReactComponent as ArrowRightIcon} from '../assets/svg/keyboardArrowRightIcon.svg'
import {getAuth, createUserWithEmailAndPassword, updateProfile} from 'firebase/auth'
import {setDoc, doc, serverTimestamp} from 'firebase/firestore'
import { db } from '../firebase.config' 
import visibilityIcon from '../assets/svg/visibilityIcon.svg'
import { toast } from 'react-toastify'
import OAuth from '../components/OAuth'

function SignUp() {
    const [showPassword, setShowPassword] = useState(false)
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: ""
    })

    const {name ,email, password} = formData

    const navigate = useNavigate()

    const onChange = (e) => {
        setFormData((prevState) => ({
            ...prevState,
            [e.target.id]: e.target.value, //changes value based on id (If it's email or password)
        }))
    }

    const onSubmit = async (e) => {
        e.preventDefault()

        try {
            const auth = getAuth()

            const userCredential = await createUserWithEmailAndPassword(
                auth, 
                email, 
                password
            )

            const user = userCredential.user

            updateProfile(auth.currentUser, {
                displayName: name
            })

            const formDataCopy = {...formData}
            delete formDataCopy.password
            formDataCopy.timestamp = serverTimestamp()

            await setDoc(doc(db, "users", user.uid), formDataCopy)

            navigate("/")
        } catch (error) {
            toast.error("Something went wrong with the registration")
        }
    }

    return (
        <>
            <div className="pageContainer">
                <header>
                    <p className="pageHeader">Welcome back!</p>
                </header>

                <form onSubmit={onSubmit}>
                    <input type="text" 
                    className="nameInput" 
                    placeholder="Name" 
                    id="name" 
                    value={name} 
                    onChange={onChange}/>

                    <input type="email" 
                    className="emailInput" 
                    placeholder="Email" 
                    id="email" 
                    value={email} 
                    onChange={onChange}/>

                    <div className="passwordInputDiv">
                        <input type={showPassword ? "text" : "password"}
                        className="passwordInput" 
                        placeholder="Password"
                        id="password"
                        value={password}
                        onChange={onChange} />

                        <img src={visibilityIcon} 
                        alt="show password"
                        className="showPassword"
                        onClick={() => setShowPassword((prevState) => !prevState)} />
                    </div>

                    <Link to="/forgot-passowrd" 
                    className="forgotPasswordLink">
                        Forgot Password
                    </Link>

                    <div className="signUpBar">
                        <p className="signUpText">
                            Sign Up
                        </p>
                        <button className="signUpButton">
                            <ArrowRightIcon fill="#ffffff" 
                            width="34px"
                            height="34px" />
                        </button>
                    </div>

                </form>
                <Link to="/sign-in" className="registerLink">
                    Sign In Instead
                </Link>

                <OAuth />
            </div>
        </>
    )
}

export default SignUp
