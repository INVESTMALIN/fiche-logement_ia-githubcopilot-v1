import Button from '../components/Button'

export default function Login() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Connexion</h1>
      <input type="email" placeholder="Email" className="mb-2 block w-full" />
      <input type="password" placeholder="Mot de passe" className="mb-4 block w-full" />
      <Button variant="primary" size="md" onClick={() => console.log('Login')}>
        Connexion
      </Button>
    </div>
  )
}
