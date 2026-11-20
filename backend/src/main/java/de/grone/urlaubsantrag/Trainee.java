package de.grone.urlaubsantrag;

import jakarta.persistence.*;

@Entity
@Table(name = "trainees")
public class Trainee {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @Column(nullable = false, unique = true) Long userId;
    @Column(nullable = false, length = 150) String trainingProgram;
    @Column(nullable = false) Long instructorId;
    @Column(nullable = false, length = 150) String trainingLocation = "Berlin";
    @Column(nullable = false, length = 5) String federalState = "DE-BE";

    protected Trainee() {}
}
