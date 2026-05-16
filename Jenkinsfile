pipeline {
  agent any

  triggers {
    cron('H 2 * * *')
  }

  options {
    timestamps()
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Prepare') {
      steps {
        sh 'node --version'
        sh 'python3 --version'
      }
    }

    stage('Run Generated Tests') {
      steps {
        sh 'TEST_PATTERN=demo_ node scripts/run-generated.mjs'
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'reports/*.html,reports/*.json', allowEmptyArchive: true
      publishHTML([
        allowMissing: true,
        alwaysLinkToLastBuild: true,
        keepAll: true,
        reportDir: 'reports',
        reportFiles: '*.html',
        reportName: 'Automation Test Report'
      ])
    }
  }
}
