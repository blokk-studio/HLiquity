import React from "react";
import { Container, Heading, Paragraph, Link } from "theme-ui";

const headingSX = {
  fontSize: "65px",
  mb: 3,
  mt: 5
}

const paragraphSX = {
  fontSize: "24px",
  maxWidth: ["unset", "unset"],
  mb: 6
}

export const PrivacyPolicyPage: React.FC = () => (
  <Container variant="column" sx={{pt: 4}}>
    <Container variant="center" sx={{ width: ["100%", "100%", "80%"] }}>
      <Heading as="h1" sx={headingSX}>
        Privacy policy
      </Heading>
      <Paragraph sx={paragraphSX}>
        Based on Article 13 of the Swiss Federal Constitution and the data protection provisions of the Swiss Confederation (Data Protection Act, DSG), every person is entitled to protection of his or her privacy as well as protection against misuse of his or her personal data. We comply with these provisions. Personal data is treated as strictly confidential and is neither sold nor passed on to third parties. In close cooperation with our hosting providers, we strive to protect the databases as well as possible against unauthorized access, loss, misuse or falsification. When you access our web pages, the following data is stored in log files: IP address, date, time, browser request and general transmitted information about the operating system or browser. This usage data forms the basis for statistical, anonymous evaluations so that trends can be identified, which we can use to improve our offerings accordingly.
      </Paragraph>
      <Heading as="h2" sx={headingSX}>
        Privacy policy for the use of Friendly Analytics
      </Heading>
      <Paragraph sx={paragraphSX}>
        We use Friendly Analytics to measure the success and reach of our website. Friendly Analytics is a service of the Swiss Friendly GmbH, which uses the free open source software Matomo without processing and storing personal data and without cookies. Information about the nature, scope and purpose of data processing can be found in the Friendly Analytics <Link sx={{fontWeight: 500, textDecoration: "underline"}} target="_blank" href="https://friendly.ch/en/privacy">privacy policy</Link>.
      </Paragraph>
    </Container>
  </Container>
);
