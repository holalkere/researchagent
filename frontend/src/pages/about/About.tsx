import React from "react";
import styles from "./About.module.css";
import RochelleImg from "../../assets/Rochelle.jpeg";
import { Link } from "react-router-dom";

const About: React.FC = () => (
  <div className={styles.aboutPage}>
    <div className={styles.newsletterContainer}>
      <div className={styles.leftColumn}>
        <img src={RochelleImg} alt="Rochelle" className={styles.roundedImage} />
        <div className={styles.personName}>Rochelle</div>
        <div className={styles.personTitle}>Customer Service Expert</div>
      </div>
      <div className={styles.rightColumn}>
        <h2>About Rochelle</h2>
        <p>
          <b>Rochelle</b> has dedicated 36 years to Stanley Black & Decker, making her the longest serving Customer Service employee in our history. Beginning her career on the Porter Cable manufacturing line building compressors, Rochelle's journey has taken her from hands on production to becoming a cornerstone of our customer service team. Today, she serves in the most senior role on our advocacy team.
        </p>
        <p>
          Rochelle's excellence is widely recognized. She has been named <b>Best Customer Service Representative</b> multiple times, received numerous <b>WIN awards</b>, and holds more <b>Hall of Fame Agent awards</b> than can be counted. Rochelle sets the gold standard for customer service, embodying the qualities we strive to replicate throughout our organization.
        </p>
        <p>
          Known for her ability to handle even the most challenging escalations with professionalism and composure, Rochelle consistently delights customers with her service. Her extensive knowledge is a resource she generously shares with fellow agents, helping to elevate the entire team.
        </p>
        <p>
          Rochelle is both monumental and instrumental to our success. She is admired by colleagues for her trustworthiness, integrity, and unwavering passion for SBD. As we create our bot avatar and name, we look to Rochelle's legacy—her dedication, expertise, and exemplary character—to inspire and represent the very best of who we are.
        </p>
      </div>
    </div>
    <div className={styles.returnButtonContainer}>
      <Link to="/" className={styles.returnButton}>
        Return to Copilot
      </Link>
    </div>
  </div>
);

export default About; 