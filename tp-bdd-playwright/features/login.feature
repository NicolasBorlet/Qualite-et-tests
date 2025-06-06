Feature: Connexion utilisateur

  Scenario: Connexion avec des identifiants valides
    Given je suis sur la page de connexion
    When je saisis un email et un mot de passe valides
    And je clique sur le bouton de connexion
    Then je dois être redirigé vers le tableau de bord

  Scenario: Connexion avec des identifiants invalides
    Given je suis sur la page de connexion
    When je saisis un email et un mot de passe invalides
    And je clique sur le bouton de connexion
    Then je dois voir un message d'erreur
